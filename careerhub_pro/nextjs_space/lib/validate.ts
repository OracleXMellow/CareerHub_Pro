// Shared request-body validation helpers for API routes.
// Keeps malformed input from reaching the LLM (wasting a call) or throwing
// unhandled type errors — both surface as clean 400s instead.

export async function readJson(request: Request): Promise<any | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
