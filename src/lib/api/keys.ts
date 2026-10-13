/**
 * API keys — format, generation, hashing, verification.
 *
 *   tsk_<keyId:16 hex>_<secret:43 base64url>
 *
 * - keyId: public identifier (64 random bits) used to find the row.
 * - secret: 256 random bits from the CSPRNG. Only its SHA-256 is stored; the
 *   plaintext is returned exactly once, at creation/rotation.
 * - SHA-256 (not a slow KDF) is correct here: the secret is uniformly random
 *   with 256 bits of entropy, so offline guessing is infeasible.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const KEY_PREFIX = "tsk_";

/** Every scope the API actually implements. Keep in sync with openapi.ts. */
export const SCOPES = {
  compute: "Compute tax under both regimes for a profile you send",
  "documents:parse": "Parse pasted Form 16 / AIS text into amounts (nothing stored)",
  "deadlines:read": "Read the income-tax deadline calendar",
  "profiles:read": "Read your saved tax profiles",
  "profiles:write": "Create, update and delete your saved tax profiles",
  "webhooks:manage": "Create, test, rotate and delete your webhook endpoints",
} as const;
export type Scope = keyof typeof SCOPES;
export const ALL_SCOPES = Object.keys(SCOPES) as Scope[];

/** Service keys (MNB products) never touch a user's private data. */
export const SERVICE_SCOPES: Scope[] = ["compute", "documents:parse", "deadlines:read"];

export const MIN_EXPIRY_DAYS = 1;
export const MAX_EXPIRY_DAYS = 365;
export const DEFAULT_EXPIRY_DAYS = 90;
export const MAX_ACTIVE_KEYS_PER_USER = 10;
export const MAX_ROTATION_OVERLAP_HOURS = 24;

export function isScope(s: unknown): s is Scope {
  return typeof s === "string" && (ALL_SCOPES as string[]).includes(s);
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateKey(): { keyId: string; secret: string; fullKey: string; secretHash: string } {
  const keyId = randomBytes(8).toString("hex");
  const secret = randomBytes(32).toString("base64url"); // 256 bits
  return { keyId, secret, fullKey: `${KEY_PREFIX}${keyId}_${secret}`, secretHash: hashSecret(secret) };
}

export function parseKey(raw: string | null | undefined): { keyId: string; secret: string } | null {
  if (!raw) return null;
  const m = /^tsk_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/.exec(raw.trim());
  return m ? { keyId: m[1], secret: m[2] } : null;
}

export function secretMatches(secret: string, storedHash: string): boolean {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** Bearer token from `Authorization: Bearer tsk_...` (or `X-API-Key`). */
export function extractKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return headers.get("x-api-key")?.trim() || null;
}

export type KeyStatus = "active" | "expired" | "revoked";
export function keyStatus(k: { expires_at: string; revoked_at: string | null }, now = new Date()): KeyStatus {
  if (k.revoked_at && new Date(k.revoked_at) <= now) return "revoked";
  if (new Date(k.expires_at) <= now) return "expired";
  return "active";
}

/** Rate limits per key kind and owner plan (requests per minute / per day). */
export function keyLimits(kind: "user" | "service", paid: boolean): { perMinute: number; perDay: number } {
  if (kind === "service") return { perMinute: 300, perDay: 50_000 };
  return paid ? { perMinute: 120, perDay: 10_000 } : { perMinute: 30, perDay: 500 };
}
