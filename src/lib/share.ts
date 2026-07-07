/**
 * Shareable read-only result links (feature batch 5).
 * The profile is base64url-encoded into the URL itself — no database row,
 * no expiry to manage, nothing stored server-side. Decoding always passes
 * through the zod schema, so a tampered link can never crash the engine.
 */
import { safeParseProfile } from "./tax-engine/validate";
import type { TaxProfile } from "./tax-engine";

export function encodeProfile(profile: TaxProfile): string {
  const json = JSON.stringify(profile);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProfile(data: string): { ok: true; profile: TaxProfile } | { ok: false; error: string } {
  try {
    if (!data || data.length > 8000) return { ok: false, error: "link too long or empty" };
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return safeParseProfile(JSON.parse(json));
  } catch {
    return { ok: false, error: "not a valid TaxSense share link" };
  }
}
