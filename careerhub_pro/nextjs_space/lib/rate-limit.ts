import { prisma } from '@/lib/db';

// Daily per-user limits by bucket. Generous for normal use, but a hard ceiling
// against runaway cost or abuse of the paid AI / PDF services.
export const DAILY_LIMITS: Record<string, number> = {
  ai: 60, // all LLM-backed endpoints (suggestions, analyze, ATS, tailor, etc.)
  pdf: 40, // PDF exports
};

export type QuotaResult = {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
};

function todayKey(): string {
  // Stable UTC day boundary so server/client agree regardless of region.
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Atomically records one usage for the given user+bucket for today and reports
 * whether they are still within their daily limit. The increment happens first
 * (atomic upsert), so concurrent requests cannot race past the ceiling.
 *
 * On any datastore error this FAILS OPEN (returns ok:true) so a transient DB
 * hiccup never blocks a paying user's core feature.
 */
export async function enforceQuota(
  userId: string,
  bucket: keyof typeof DAILY_LIMITS | string = 'ai',
): Promise<QuotaResult> {
  const limit = DAILY_LIMITS[bucket] ?? DAILY_LIMITS.ai;
  const date = todayKey();
  try {
    const record = await prisma.aiUsage.upsert({
      where: { userId_date_bucket: { userId, date, bucket } },
      create: { userId, date, bucket, count: 1 },
      update: { count: { increment: 1 } },
    });
    const used = record.count;
    return {
      ok: used <= limit,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  } catch (e) {
    console.error('Quota check failed (failing open):', e);
    return { ok: true, used: 0, limit, remaining: limit };
  }
}

export function quotaMessage(bucket: string, limit: number): string {
  const label = bucket === 'pdf' ? 'PDF export' : 'AI';
  return `You've reached your daily ${label} limit (${limit} per day). This limit resets at midnight UTC. If you need a higher limit, let us know.`;
}

/** Standard 429 JSON Response for streaming/plain routes. */
export function quotaResponse(bucket: string, limit: number): Response {
  return new Response(
    JSON.stringify({ error: quotaMessage(bucket, limit) }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}
