// Shared, resilient LLM helpers used across all AI features.
// Provides: timeouts, automatic retries with exponential backoff on transient
// failures, and robust JSON extraction that tolerates code fences / stray text.

const LLM_ENDPOINT = 'https://apps.abacus.ai/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5.4-mini';

export type ChatMessage = { role: string; content: any };

export class AIError extends Error {
  status: number;
  userMessage: string;
  constructor(userMessage: string, status = 502) {
    super(userMessage);
    this.name = 'AIError';
    this.status = status;
    this.userMessage = userMessage;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Robustly extract a JSON value from an LLM text response.
 * Handles: raw JSON, ```json fenced blocks, and surrounding prose by
 * locating the first balanced {...} or [...] region.
 */
export function extractJson<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty AI response');
  }
  let text = raw.trim();

  // Strip markdown code fences if present.
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Fast path: already valid JSON.
  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through to bracket extraction
  }

  // Find the first plausible JSON region (object or array).
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  let start = -1;
  let openCh = '{';
  let closeCh = '}';
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    openCh = '[';
    closeCh = ']';
  } else if (firstObj !== -1) {
    start = firstObj;
  }
  if (start === -1) throw new Error('No JSON found in AI response');

  // Walk forward tracking string/escape state to find the matching close.
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        return JSON.parse(candidate) as T;
      }
    }
  }
  throw new Error('Incomplete JSON in AI response');
}

interface CallOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retries?: number;
  timeoutMs?: number;
}

/**
 * Call the LLM and return the raw assistant message content string.
 * Retries on network errors, timeouts, 429 and 5xx responses.
 */
export async function callLLM(opts: CallOptions): Promise<string> {
  const {
    messages,
    model = DEFAULT_MODEL,
    maxTokens = 4000,
    temperature,
    jsonMode = false,
    retries = 2,
    timeoutMs = 60000,
  } = opts;

  if (!process.env.ABACUSAI_API_KEY) {
    throw new AIError('AI service is not configured. Please try again later.', 500);
  }

  const payload: any = { model, messages, max_tokens: maxTokens };
  if (typeof temperature === 'number') payload.temperature = temperature;
  if (jsonMode) payload.response_format = { type: 'json_object' };

  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(LLM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content || !content.trim()) {
          throw new Error('Empty content from AI');
        }
        return content;
      }

      // Non-OK. Decide whether to retry.
      const errText = await response.text().catch(() => '');
      console.error(`LLM API error (attempt ${attempt + 1}): ${response.status} ${errText.slice(0, 300)}`);

      if (response.status === 429 || response.status >= 500) {
        lastErr = new Error(`Transient AI error ${response.status}`);
        // retry
      } else {
        // Client error (400/401/403) - not retryable.
        throw new AIError('The AI service rejected the request. Please try again.', 502);
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof AIError) throw err;
      const isAbort = err?.name === 'AbortError';
      console.error(`LLM call failed (attempt ${attempt + 1}):`, isAbort ? 'timeout' : err?.message || err);
      lastErr = err;
    }

    // Backoff before the next attempt (250ms, 750ms, ...), if any remain.
    if (attempt < retries) {
      await sleep(250 * Math.pow(3, attempt));
    }
  }

  throw new AIError(
    'The AI service is temporarily busy. Please try again in a moment.',
    503,
  );
}

/**
 * Call the LLM expecting a JSON response, with retries and resilient parsing.
 * If the model returns malformed JSON, one extra retry is attempted before failing.
 */
export async function callLLMJson<T = any>(opts: CallOptions): Promise<T> {
  const content = await callLLM({ ...opts, jsonMode: opts.jsonMode !== false });
  try {
    return extractJson<T>(content);
  } catch (parseErr: any) {
    console.error('First JSON parse failed, retrying once:', parseErr?.message);
    // One corrective retry with an explicit instruction appended.
    const retryMessages: ChatMessage[] = [
      ...opts.messages,
      { role: 'assistant', content },
      { role: 'user', content: 'Your previous response was not valid JSON. Respond again with ONLY the valid JSON object, no code fences, no commentary.' },
    ];
    const retryContent = await callLLM({ ...opts, messages: retryMessages, jsonMode: opts.jsonMode !== false });
    return extractJson<T>(retryContent);
  }
}

interface StreamOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retries?: number;
  connectTimeoutMs?: number;
}

/**
 * Open a streaming LLM connection with retries on the INITIAL connection only.
 * Retries on network errors, connect timeouts, 429 and 5xx before any bytes
 * are streamed. Once headers are received the timeout is cleared so the body
 * can stream freely. Returns the live Response for the caller to read.
 */
export async function fetchLLMStream(opts: StreamOptions): Promise<Response> {
  const {
    messages,
    model = DEFAULT_MODEL,
    maxTokens = 3000,
    temperature,
    jsonMode = false,
    retries = 2,
    connectTimeoutMs = 30000,
  } = opts;

  if (!process.env.ABACUSAI_API_KEY) {
    throw new AIError('AI service is not configured. Please try again later.', 500);
  }

  const payload: any = { model, messages, max_tokens: maxTokens, stream: true };
  if (typeof temperature === 'number') payload.temperature = temperature;
  if (jsonMode) payload.response_format = { type: 'json_object' };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), connectTimeoutMs);
    try {
      const response = await fetch(LLM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      // Headers received: stop the connect timer so the body streams freely.
      clearTimeout(timer);

      if (response.ok && response.body) {
        return response;
      }

      const errText = await response.text().catch(() => '');
      console.error(`LLM stream error (attempt ${attempt + 1}): ${response.status} ${errText.slice(0, 300)}`);
      if (response.status === 429 || response.status >= 500) {
        // retryable
      } else {
        throw new AIError('The AI service rejected the request. Please try again.', 502);
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof AIError) throw err;
      const isAbort = err?.name === 'AbortError';
      console.error(`LLM stream connect failed (attempt ${attempt + 1}):`, isAbort ? 'timeout' : err?.message || err);
    }
    if (attempt < retries) {
      await sleep(250 * Math.pow(3, attempt));
    }
  }

  throw new AIError('The AI service is temporarily busy. Please try again in a moment.', 503);
}

/** Standard JSON error Response helper for API routes. */
export function aiErrorResponse(err: any) {
  const status = err instanceof AIError ? err.status : 500;
  const message = err instanceof AIError ? err.userMessage : 'Something went wrong. Please try again.';
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
