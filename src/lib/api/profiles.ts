/** Shared profile save logic (app UI and API both use it). */
import { computeBoth } from "@/lib/tax-engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { getEntitlementsForEmail } from "@/lib/entitlements";
import type { ApiStore, ProfileRow } from "./store";
import { profileSummary } from "./report";
import { emitWebhook } from "./webhooks";

export function cleanLabel(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return "My profile";
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 120);
  return s || null;
}

export function publicProfile(r: ProfileRow, includeProfile: boolean) {
  return {
    id: r.id, label: r.label, financialYear: r.fy, createdAt: r.created_at, updatedAt: r.updated_at,
    summary: profileSummary(r.computation),
    ...(includeProfile ? { profile: r.profile } : {}),
  };
}

export async function saveProfile(store: ApiStore, userId: string, label: string, rawProfile: unknown):
  Promise<{ ok: true; row: ProfileRow; created: boolean } | { ok: false; code: "invalid_request" | "payment_required"; message: string }> {
  const parsed = safeParseProfile(rawProfile);
  if (!parsed.ok) return { ok: false, code: "invalid_request", message: `Invalid profile — ${parsed.error}` };
  const ent = await getEntitlementsForEmail(await store.userEmail(userId));
  const max = ent.features.clientWorkbook ? 500 : ent.features.scenarios + 1;
  const labels = await store.profileLabels(userId);
  const created = !labels.includes(label);
  if (created && labels.length >= max) return { ok: false, code: "payment_required", message: `Your plan stores up to ${max} profile${max === 1 ? "" : "s"} — delete one or upgrade.` };
  const row = await store.upsertProfile(userId, label, parsed.profile, computeBoth(parsed.profile));
  return { ok: true, row, created };
}

export function profileEventData(r: ProfileRow) {
  return { profileId: r.id, label: r.label, financialYear: r.fy, updatedAt: r.updated_at, summary: profileSummary(r.computation) };
}

export async function emitProfileSaved(store: ApiStore, userId: string, r: ProfileRow) {
  await emitWebhook(store, userId, "profile.saved", profileEventData(r));
}
