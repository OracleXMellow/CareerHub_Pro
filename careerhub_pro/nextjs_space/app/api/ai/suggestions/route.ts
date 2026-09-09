export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLLMStream, aiErrorResponse } from "@/lib/ai";
import { enforceQuota, quotaResponse } from "@/lib/rate-limit";
import { readJson, isNonEmptyString } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const __q = await enforceQuota((session.user as any).id, 'ai');
    if (!__q.ok) return quotaResponse('ai', __q.limit);
    const body = await readJson(request);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { bulletPoints, jobTitle } = body;
    if (!isNonEmptyString(bulletPoints)) {
      return new Response(JSON.stringify({ error: "bulletPoints required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const messages = [
      {
        role: 'system',
        content: `You are an expert career coach and resume writer. Improve the given resume bullet points to be more impactful, quantifiable, and action-oriented. For each bullet point, provide an improved version and a brief explanation of the improvement. Respond in JSON format with the following structure:
{
  "suggestions": [
    {
      "original": "original bullet point",
      "improved": "improved bullet point",
      "explanation": "why this improvement is better"
    }
  ]
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
      },
      {
        role: 'user',
        content: `Job title: ${jobTitle ?? 'Not specified'}\n\nBullet points to improve:\n${bulletPoints}`
      }
    ];

    const response = await fetchLLMStream({ messages, maxTokens: 3000, jsonMode: true });

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let partialRead = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer);
                    const finalData = JSON.stringify({ status: 'completed', result: finalResult });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { suggestions: [] } })}\n\n`));
                  }
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content ?? '';
                  const progressData = JSON.stringify({ status: 'processing', message: 'Analyzing your content...' });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch {}
              }
            }
          }
          if (buffer) {
            try {
              const finalResult = JSON.parse(buffer);
              const finalData = JSON.stringify({ status: 'completed', result: finalResult });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse AI response' })}\n\n`));
            }
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error?.message ?? 'Stream error' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    return aiErrorResponse(error);
  }
}
