/**
 * Minimal in-memory token bucket per IP (per serverless instance).
 * Good enough to blunt abuse on the free tier; swap for Upstash/Redis at scale.
 */
const g = globalThis as any;
g.__taxsenseBuckets ??= new Map<string, { tokens: number; last: number }>();
const buckets: Map<string, { tokens: number; last: number }> = g.__taxsenseBuckets;

export function rateLimit(
  key: string,
  { capacity = 20, refillPerMinute = 20 }: { capacity?: number; refillPerMinute?: number } = {}
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 60_000) * refillPerMinute);
  b.last = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  buckets.set(key, b);
  return { allowed: false, retryAfterSeconds: Math.ceil((1 - b.tokens) * (60 / refillPerMinute)) };
}

export function clientKey(req: Request): string {
  const h = (name: string) => (req.headers.get(name) ?? "").split(",")[0].trim();
  return h("x-forwarded-for") || h("x-real-ip") || "anonymous";
}
