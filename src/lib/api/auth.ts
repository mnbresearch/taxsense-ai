/**
 * Bearer-key authentication for /api/v1. Order of checks:
 *   format → lookup → constant-time secret check → revoked/expired →
 *   scope → per-key rate limits (minute + day) → usage accounting.
 * Session cookies are NEVER consulted on these routes, so CSRF does not apply.
 */
import type { NextResponse } from "next/server";
import { extractKey, keyLimits, keyStatus, parseKey, secretMatches, type Scope } from "./keys";
import { getApiStore, type ApiKeyRow, type ApiStore } from "./store";
import { fail } from "./respond";
import { rateLimitShared } from "@/lib/rateLimit";
import { getEntitlementsForEmail } from "@/lib/entitlements";

export interface ApiContext {
  key: ApiKeyRow;
  store: ApiStore;
  /** Owner user id for user keys; null for service keys (no access to user data). */
  userId: string | null;
  limits: { perMinute: number; perDay: number };
}

const LAST_USED_WRITE_EVERY_MS = 5 * 60_000;
const PAID_CACHE_MS = 5 * 60_000;
const paidCache = new Map<string, { paid: boolean; at: number }>();

export async function authenticate(
  req: Request,
  required: Scope | null,
  rid: string,
  opts: { store?: ApiStore; now?: Date } = {}
): Promise<{ ok: true; ctx: ApiContext } | { ok: false; res: NextResponse }> {
  const store = opts.store ?? getApiStore();
  const now = opts.now ?? new Date();
  const parsed = parseKey(extractKey(req.headers));
  const deny = (message: string) =>
    ({ ok: false as const, res: fail("unauthorized", message, rid, 401, { headers: { "www-authenticate": 'Bearer realm="taxsense"' } }) });
  if (!parsed) return deny("Missing or malformed API key. Send `Authorization: Bearer tsk_…`.");

  let key: ApiKeyRow | null = null;
  try { key = await store.findKeyByKeyId(parsed.keyId); }
  catch { return { ok: false, res: fail("unavailable", "Key service unavailable — try again", rid, 503) }; }
  // Same generic message for unknown key and wrong secret (no key enumeration).
  if (!key || !secretMatches(parsed.secret, key.secret_hash)) return deny("Invalid API key.");
  const status = keyStatus(key, now);
  if (status === "revoked") return deny("This API key has been revoked.");
  if (status === "expired") return deny("This API key has expired. Create or rotate a key.");
  if (required && !key.scopes.includes(required)) {
    return { ok: false, res: fail("forbidden", `This key lacks the \`${required}\` scope.`, rid, 403) };
  }

  let paid = false;
  if (key.kind === "user" && key.user_id) {
    const hit = paidCache.get(key.user_id);
    if (hit && hit.at > now.getTime() - PAID_CACHE_MS) paid = hit.paid;
    else {
      try { paid = (await getEntitlementsForEmail(await store.userEmail(key.user_id))).active; } catch { paid = false; }
      paidCache.set(key.user_id, { paid, at: now.getTime() });
    }
  }
  const limits = keyLimits(key.kind, paid);
  const fb = { capacity: limits.perMinute, refillPerMinute: limits.perMinute };
  const m = await rateLimitShared(`apikey:${key.id}:m`, limits.perMinute, 60, fb);
  if (!m.allowed) return { ok: false, res: fail("rate_limited", `Rate limit: ${limits.perMinute} requests/minute`, rid, 429, { headers: { "retry-after": String(m.retryAfterSeconds) } }) };
  const d = await rateLimitShared(`apikey:${key.id}:d`, limits.perDay, 86_400, { capacity: limits.perDay, refillPerMinute: limits.perDay / 1440 });
  if (!d.allowed) return { ok: false, res: fail("rate_limited", `Daily quota reached: ${limits.perDay} requests/day`, rid, 429, { headers: { "retry-after": String(d.retryAfterSeconds) } }) };

  // Best-effort accounting — never fails the request.
  try {
    await store.usageHit(key.id);
    if (!key.last_used_at || now.getTime() - new Date(key.last_used_at).getTime() > LAST_USED_WRITE_EVERY_MS) {
      await store.updateKey(key.id, { last_used_at: now.toISOString() });
    }
  } catch { /* ignore */ }

  return { ok: true, ctx: { key, store, userId: key.kind === "user" ? key.user_id : null, limits } };
}

/** Guard for routes that act on the key owner's private data. */
export function requireUserKey(ctx: ApiContext, rid: string): { ok: true; userId: string } | { ok: false; res: NextResponse } {
  if (!ctx.userId) return { ok: false, res: fail("forbidden", "Service keys cannot access user data.", rid, 403) };
  return { ok: true, userId: ctx.userId };
}
