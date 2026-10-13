/**
 * API-key lifecycle: create, list, rotate/regenerate, revoke.
 * All ownership checks live here so the HTTP layer can't forget them.
 */
import {
  ALL_SCOPES, DEFAULT_EXPIRY_DAYS, MAX_ACTIVE_KEYS_PER_USER, MAX_EXPIRY_DAYS, MAX_ROTATION_OVERLAP_HOURS,
  MIN_EXPIRY_DAYS, SERVICE_SCOPES, generateKey, isScope, keyStatus, type Scope,
} from "./keys";
import { toPublicKey, type ApiKeyRow, type ApiStore, type PublicKey } from "./store";

export type Actor = { userId: string; isAdmin: boolean };
export type KeyError = { code: "invalid_request" | "forbidden" | "not_found" | "conflict"; message: string };

export interface CreateInput { name: unknown; scopes: unknown; expiresInDays?: unknown; kind?: unknown }

export function validateCreate(input: CreateInput, actor: Actor):
  | { ok: true; name: string; scopes: Scope[]; days: number; kind: "user" | "service" }
  | { ok: false; err: KeyError } {
  const kind = input.kind === "service" ? "service" : "user";
  if (kind === "service" && !actor.isAdmin) return { ok: false, err: { code: "forbidden", message: "Only admins can create service keys." } };
  const name = typeof input.name === "string" ? input.name.trim().replace(/[\u0000-\u001f<>]/g, "").slice(0, 60) : "";
  if (!name) return { ok: false, err: { code: "invalid_request", message: "name is required (1–60 characters)." } };
  if (!Array.isArray(input.scopes) || input.scopes.length === 0) return { ok: false, err: { code: "invalid_request", message: `scopes must be a non-empty array of: ${ALL_SCOPES.join(", ")}` } };
  const bad = input.scopes.filter((s) => !isScope(s));
  if (bad.length) return { ok: false, err: { code: "invalid_request", message: `Unknown scope(s): ${bad.map(String).join(", ")}` } };
  const scopes = [...new Set(input.scopes as Scope[])];
  if (kind === "service") {
    const notAllowed = scopes.filter((s) => !SERVICE_SCOPES.includes(s));
    if (notAllowed.length) return { ok: false, err: { code: "invalid_request", message: `Service keys may only hold: ${SERVICE_SCOPES.join(", ")}` } };
  }
  const days = input.expiresInDays === undefined ? DEFAULT_EXPIRY_DAYS : Number(input.expiresInDays);
  if (!Number.isInteger(days) || days < MIN_EXPIRY_DAYS || days > MAX_EXPIRY_DAYS) {
    return { ok: false, err: { code: "invalid_request", message: `expiresInDays must be an integer ${MIN_EXPIRY_DAYS}–${MAX_EXPIRY_DAYS}.` } };
  }
  return { ok: true, name, scopes, days, kind };
}

export async function createKey(store: ApiStore, actor: Actor, input: CreateInput, now = new Date()):
  Promise<{ ok: true; key: PublicKey; secret: string } | { ok: false; err: KeyError }> {
  const v = validateCreate(input, actor);
  if (!v.ok) return v;
  if (v.kind === "user") {
    const active = (await store.listKeys({ userId: actor.userId })).filter((k) => keyStatus(k, now) === "active");
    if (active.length >= MAX_ACTIVE_KEYS_PER_USER) return { ok: false, err: { code: "conflict", message: `You already have ${MAX_ACTIVE_KEYS_PER_USER} active keys — revoke one first.` } };
  }
  const g = generateKey();
  const row = await store.insertKey({
    key_id: g.keyId, user_id: actor.userId, kind: v.kind, name: v.name, scopes: v.scopes,
    secret_hash: g.secretHash, expires_at: new Date(now.getTime() + v.days * 86_400_000).toISOString(), rotated_from: null,
  });
  return { ok: true, key: toPublicKey(row), secret: g.fullKey };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function load(store: ApiStore, id: string): Promise<ApiKeyRow | null> {
  return UUID.test(id) ? store.getKey(id) : null;
}

/** A user sees their own user keys; an admin may also manage service keys. */
function canManage(k: ApiKeyRow, actor: Actor): boolean {
  if (k.kind === "service") return actor.isAdmin;
  return k.user_id === actor.userId;
}

export async function revokeKey(store: ApiStore, actor: Actor, id: string, now = new Date()): Promise<{ ok: true } | { ok: false; err: KeyError }> {
  const k = await load(store, id);
  // Admins may revoke any key (incident response); everyone else only their own.
  if (!k || !(canManage(k, actor) || actor.isAdmin)) return { ok: false, err: { code: "not_found", message: "Key not found." } };
  if (keyStatus(k, now) !== "revoked") await store.updateKey(id, { revoked_at: now.toISOString() });
  return { ok: true };
}

/**
 * Rotate: issue a new secret with the same name/scopes/lifetime and retire the
 * old one — immediately (overlapHours = 0, "regenerate") or after a short
 * overlap (≤ 24h) so callers can deploy the new key without downtime.
 */
export async function rotateKey(store: ApiStore, actor: Actor, id: string, overlapHours: unknown, now = new Date()):
  Promise<{ ok: true; key: PublicKey; secret: string; oldKeyRetiresAt: string } | { ok: false; err: KeyError }> {
  const k = await load(store, id);
  if (!k || !canManage(k, actor)) return { ok: false, err: { code: "not_found", message: "Key not found." } };
  if (keyStatus(k, now) !== "active") return { ok: false, err: { code: "conflict", message: "Only an active key can be rotated." } };
  const overlap = overlapHours === undefined ? 0 : Number(overlapHours);
  if (!Number.isFinite(overlap) || overlap < 0 || overlap > MAX_ROTATION_OVERLAP_HOURS) {
    return { ok: false, err: { code: "invalid_request", message: `overlapHours must be 0–${MAX_ROTATION_OVERLAP_HOURS}.` } };
  }
  const lifetimeMs = Math.max(86_400_000, new Date(k.expires_at).getTime() - new Date(k.created_at).getTime());
  const g = generateKey();
  const row = await store.insertKey({
    key_id: g.keyId, user_id: k.user_id, kind: k.kind, name: k.name, scopes: k.scopes, secret_hash: g.secretHash,
    expires_at: new Date(now.getTime() + Math.min(lifetimeMs, 365 * 86_400_000)).toISOString(), rotated_from: k.id,
  });
  const retires = new Date(now.getTime() + overlap * 3_600_000).toISOString();
  await store.updateKey(k.id, { revoked_at: retires });
  return { ok: true, key: toPublicKey(row), secret: g.fullKey, oldKeyRetiresAt: retires };
}

export async function listKeys(store: ApiStore, actor: Actor, opts: { service?: boolean } = {}, now = new Date()) {
  const rows = opts.service && actor.isAdmin ? await store.listKeys({ kind: "service" }) : await store.listKeys({ userId: actor.userId });
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  let usage: Record<string, number> = {};
  try { usage = await store.usageSince(rows.map((r) => r.id), since); } catch { usage = {}; }
  return rows.map((r) => ({ ...toPublicKey(r), status: keyStatus(r, now), requests30d: usage[r.id] ?? 0 }));
}
