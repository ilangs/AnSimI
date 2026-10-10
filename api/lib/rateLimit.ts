import type { VercelRequest } from '@vercel/node';

/**
 * 인메모리 rate limit (Vercel serverless 인스턴스별 — 완전한 전역 제한은 Upstash 등 필요)
 * ANALYZE_RATE_LIMIT_PER_MINUTE env (기본 20)
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function windowKey(userId: string): string {
  const minute = Math.floor(Date.now() / 60_000);
  return `${userId}:${minute}`;
}

export function checkAnalyzeRateLimit(userId: string, req: VercelRequest): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const limit = Number(process.env.ANALYZE_RATE_LIMIT_PER_MINUTE ?? 20);
  if (!Number.isFinite(limit) || limit <= 0) return { ok: true };

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    (req.headers['x-real-ip'] as string) ??
    'unknown';

  const key = windowKey(`${userId}:${ip}`);
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

// 오래된 버킷 정리 (메모리 누수 방지)
if (buckets.size > 10_000) {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}
