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

/**
 * Shared, cross-instance rate limit backed by Postgres (atomic via SECURITY
 * DEFINER function `rl_hit`). Serverless instances don't share memory, so the
 * in-memory bucket above only blunts a same-instance hammer; this holds under
 * concurrent/distributed load. Fails OPEN to the in-memory limiter if the DB
 * or the migration isn't available — so there is never a hard regression.
 *
 * @param key         logical bucket, e.g. `taxcheck:1.2.3.4`
 * @param limit       max hits per window
 * @param windowSecs  window length in seconds
 * @param fallback    in-memory bucket params used when the DB path is unavailable
 */
export async function rateLimitShared(
  key: string,
  limit: number,
  windowSecs: number,
  fallback: { capacity: number; refillPerMinute: number }
): Promise<{ allowed: boolean; retryAfterSeconds: number; via: "db" | "memory" }> {
  try {
    // Lazy import to keep this module usable in pure-compute contexts/tests.
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const admin = supabaseAdmin();
    if (admin) {
      const { data, error } = await admin.rpc("rl_hit", {
        p_key: key,
        p_limit: limit,
        p_window_secs: windowSecs,
      });
      if (!error && typeof data === "boolean") {
        return { allowed: data, retryAfterSeconds: data ? 0 : windowSecs, via: "db" };
      }
    }
  } catch {
    /* fall through to in-memory */
  }
  const r = rateLimit(key, fallback);
  return { allowed: r.allowed, retryAfterSeconds: r.retryAfterSeconds, via: "memory" };
}
