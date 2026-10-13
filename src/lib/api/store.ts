/**
 * Persistence for the API platform behind one interface:
 *   - Supabase (service role, server only) in production
 *   - in-memory in demo mode / tests (same behaviour, no infra)
 * Ownership is enforced HERE: every user-data method takes the owner id and
 * filters on it, because the service-role client bypasses RLS.
 */
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

export const FY = "FY2025-26";

export interface ApiKeyRow {
  id: string;
  key_id: string;
  user_id: string | null;
  kind: "user" | "service";
  name: string;
  scopes: string[];
  secret_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  rotated_from: string | null;
}
export type PublicKey = Omit<ApiKeyRow, "secret_hash">;
export const toPublicKey = ({ secret_hash: _omit, ...rest }: ApiKeyRow): PublicKey => { void _omit; return rest; };

export interface ProfileRow {
  id: string;
  label: string;
  fy: string;
  profile: unknown;
  computation: unknown;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpointRow {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret_salt: string;
  active: boolean;
  created_at: string;
}
export interface WebhookDeliveryRow {
  id: string;
  endpoint_id: string;
  event: string;
  payload: unknown;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}

export interface ApiStore {
  readonly mode: "supabase" | "memory";
  insertKey(row: Omit<ApiKeyRow, "id" | "created_at" | "last_used_at" | "revoked_at"> & { revoked_at?: string | null }): Promise<ApiKeyRow>;
  findKeyByKeyId(keyId: string): Promise<ApiKeyRow | null>;
  getKey(id: string): Promise<ApiKeyRow | null>;
  listKeys(owner: { userId: string } | { kind: "service" } | { all: true }): Promise<ApiKeyRow[]>;
  updateKey(id: string, patch: Partial<Pick<ApiKeyRow, "revoked_at" | "expires_at" | "last_used_at" | "name">>): Promise<void>;
  usageHit(keyUuid: string): Promise<void>;
  usageSince(keyUuids: string[], sinceDay: string): Promise<Record<string, number>>;
  userEmail(userId: string): Promise<string | null>;

  listProfiles(userId: string, limit: number, cursor: { updated_at: string; id: string } | null): Promise<ProfileRow[]>;
  getProfile(userId: string, id: string): Promise<ProfileRow | null>;
  profileLabels(userId: string): Promise<string[]>;
  upsertProfile(userId: string, label: string, profile: unknown, computation: unknown): Promise<ProfileRow>;
  deleteProfile(userId: string, id: string): Promise<boolean>;

  listWebhooks(userId: string): Promise<WebhookEndpointRow[]>;
  getWebhook(userId: string, id: string): Promise<WebhookEndpointRow | null>;
  insertWebhook(row: Omit<WebhookEndpointRow, "id" | "created_at">): Promise<WebhookEndpointRow>;
  updateWebhook(userId: string, id: string, patch: Partial<Pick<WebhookEndpointRow, "secret_salt" | "active" | "events" | "url">>): Promise<void>;
  deleteWebhook(userId: string, id: string): Promise<boolean>;
  webhooksForEvent(userId: string, event: string): Promise<WebhookEndpointRow[]>;
  insertDelivery(row: Pick<WebhookDeliveryRow, "endpoint_id" | "event" | "payload">): Promise<WebhookDeliveryRow>;
  updateDelivery(id: string, patch: Partial<Omit<WebhookDeliveryRow, "id" | "endpoint_id">>): Promise<void>;
  listDeliveries(endpointId: string, limit: number): Promise<WebhookDeliveryRow[]>;
  retryableDeliveries(sinceIso: string, limit: number): Promise<WebhookDeliveryRow[]>;
  getWebhookById(id: string): Promise<WebhookEndpointRow | null>;
}

/* ------------------------------ memory ------------------------------ */
type Mem = {
  keys: Map<string, ApiKeyRow>;
  usage: Map<string, number>;
  profiles: Map<string, ProfileRow & { user_id: string }>;
  hooks: Map<string, WebhookEndpointRow>;
  deliveries: Map<string, WebhookDeliveryRow>;
  emails: Map<string, string>;
};
const g = globalThis as typeof globalThis & { __taxsenseApiMem?: Mem };
function mem(): Mem {
  g.__taxsenseApiMem ??= { keys: new Map(), usage: new Map(), profiles: new Map(), hooks: new Map(), deliveries: new Map(), emails: new Map() };
  return g.__taxsenseApiMem;
}
/** Test helper: wipe the in-memory store. */
export function resetMemoryStore() { delete g.__taxsenseApiMem; }
/** Test/demo helper: register an email for a user id. */
export function setMemoryUserEmail(userId: string, email: string) { mem().emails.set(userId, email); }

const nowIso = () => new Date().toISOString();
const byUpdatedDesc = (a: ProfileRow, b: ProfileRow) =>
  a.updated_at === b.updated_at ? (a.id < b.id ? 1 : -1) : a.updated_at < b.updated_at ? 1 : -1;

export const memoryStore: ApiStore = {
  mode: "memory",
  async insertKey(row) {
    const r: ApiKeyRow = { ...row, id: randomUUID(), created_at: nowIso(), last_used_at: null, revoked_at: row.revoked_at ?? null };
    mem().keys.set(r.id, r);
    return { ...r };
  },
  async findKeyByKeyId(keyId) { for (const k of mem().keys.values()) if (k.key_id === keyId) return { ...k }; return null; },
  async getKey(id) { const k = mem().keys.get(id); return k ? { ...k } : null; },
  async listKeys(owner) {
    return [...mem().keys.values()]
      .filter((k) => ("all" in owner ? true : "kind" in owner ? k.kind === "service" : k.user_id === owner.userId && k.kind === "user"))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((k) => ({ ...k }));
  },
  async updateKey(id, patch) { const k = mem().keys.get(id); if (k) Object.assign(k, patch); },
  async usageHit(keyUuid) { const k = `${keyUuid}|${nowIso().slice(0, 10)}`; mem().usage.set(k, (mem().usage.get(k) ?? 0) + 1); },
  async usageSince(ids, since) {
    const out: Record<string, number> = {};
    for (const [k, v] of mem().usage) { const [id, day] = k.split("|"); if (ids.includes(id) && day >= since) out[id] = (out[id] ?? 0) + v; }
    return out;
  },
  async userEmail(userId) { return mem().emails.get(userId) ?? null; },

  async listProfiles(userId, limit, cursor) {
    let rows = [...mem().profiles.values()].filter((p) => p.user_id === userId).sort(byUpdatedDesc);
    if (cursor) rows = rows.filter((p) => p.updated_at < cursor.updated_at || (p.updated_at === cursor.updated_at && p.id < cursor.id));
    return rows.slice(0, limit).map(({ user_id: _u, ...p }) => { void _u; return p; });
  },
  async getProfile(userId, id) { const p = mem().profiles.get(id); if (!p || p.user_id !== userId) return null; const { user_id: _u, ...rest } = p; void _u; return rest; },
  async profileLabels(userId) { return [...mem().profiles.values()].filter((p) => p.user_id === userId).map((p) => p.label); },
  async upsertProfile(userId, label, profile, computation) {
    const existing = [...mem().profiles.values()].find((p) => p.user_id === userId && p.label === label);
    const ts = nowIso();
    const row = existing
      ? Object.assign(existing, { profile, computation, updated_at: ts })
      : { id: randomUUID(), user_id: userId, label, fy: FY, profile, computation, created_at: ts, updated_at: ts };
    mem().profiles.set(row.id, row);
    const { user_id: _u, ...rest } = row; void _u;
    return { ...rest };
  },
  async deleteProfile(userId, id) { const p = mem().profiles.get(id); if (!p || p.user_id !== userId) return false; mem().profiles.delete(id); return true; },

  async listWebhooks(userId) { return [...mem().hooks.values()].filter((h) => h.user_id === userId).map((h) => ({ ...h })); },
  async getWebhook(userId, id) { const h = mem().hooks.get(id); return h && h.user_id === userId ? { ...h } : null; },
  async getWebhookById(id) { const h = mem().hooks.get(id); return h ? { ...h } : null; },
  async insertWebhook(row) { const h = { ...row, id: randomUUID(), created_at: nowIso() }; mem().hooks.set(h.id, h); return { ...h }; },
  async updateWebhook(userId, id, patch) { const h = mem().hooks.get(id); if (h && h.user_id === userId) Object.assign(h, patch); },
  async deleteWebhook(userId, id) {
    const h = mem().hooks.get(id); if (!h || h.user_id !== userId) return false;
    mem().hooks.delete(id);
    for (const [did, d] of mem().deliveries) if (d.endpoint_id === id) mem().deliveries.delete(did);
    return true;
  },
  async webhooksForEvent(userId, event) { return [...mem().hooks.values()].filter((h) => h.user_id === userId && h.active && h.events.includes(event)).map((h) => ({ ...h })); },
  async insertDelivery(row) {
    const d: WebhookDeliveryRow = { ...row, id: randomUUID(), status: "pending", attempts: 0, last_status: null, last_error: null, created_at: nowIso(), delivered_at: null };
    mem().deliveries.set(d.id, d); return { ...d };
  },
  async updateDelivery(id, patch) { const d = mem().deliveries.get(id); if (d) Object.assign(d, patch); },
  async listDeliveries(endpointId, limit) {
    return [...mem().deliveries.values()].filter((d) => d.endpoint_id === endpointId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit).map((d) => ({ ...d }));
  },
  async retryableDeliveries(since, limit) {
    return [...mem().deliveries.values()].filter((d) => d.status === "failed" && d.attempts < 6 && d.created_at >= since).slice(0, limit).map((d) => ({ ...d }));
  },
};

/* ------------------------------ supabase ------------------------------ */
function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}
const PROFILE_COLS = "id, label, fy, profile, computation, created_at, updated_at";

export function supabaseStore(sb: SupabaseClient): ApiStore {
  return {
    mode: "supabase",
    async insertKey(row) { return must(await sb.from("api_keys").insert(row).select("*").single()) as ApiKeyRow; },
    async findKeyByKeyId(keyId) { return (must(await sb.from("api_keys").select("*").eq("key_id", keyId).maybeSingle()) as ApiKeyRow | null); },
    async getKey(id) { return (must(await sb.from("api_keys").select("*").eq("id", id).maybeSingle()) as ApiKeyRow | null); },
    async listKeys(owner) {
      let q = sb.from("api_keys").select("*").order("created_at", { ascending: false }).limit(500);
      if ("kind" in owner) q = q.eq("kind", "service");
      else if ("userId" in owner) q = q.eq("user_id", owner.userId).eq("kind", "user");
      return must(await q) as ApiKeyRow[];
    },
    async updateKey(id, patch) { must(await sb.from("api_keys").update(patch).eq("id", id)); },
    async usageHit(keyUuid) { await sb.rpc("api_usage_hit", { p_key: keyUuid }); },
    async usageSince(ids, since) {
      if (!ids.length) return {};
      const rows = must(await sb.from("api_usage_daily").select("key_uuid, requests").in("key_uuid", ids).gte("day", since)) as { key_uuid: string; requests: number }[];
      const out: Record<string, number> = {};
      for (const r of rows) out[r.key_uuid] = (out[r.key_uuid] ?? 0) + r.requests;
      return out;
    },
    async userEmail(userId) {
      const { data } = await sb.auth.admin.getUserById(userId);
      return data?.user?.email?.toLowerCase() ?? null;
    },

    async listProfiles(userId, limit, cursor) {
      let q = sb.from("tax_profiles").select(PROFILE_COLS).eq("user_id", userId).eq("fy", FY)
        .order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
      if (cursor) q = q.or(`updated_at.lt."${cursor.updated_at}",and(updated_at.eq."${cursor.updated_at}",id.lt.${cursor.id})`);
      return must(await q) as ProfileRow[];
    },
    async getProfile(userId, id) { return must(await sb.from("tax_profiles").select(PROFILE_COLS).eq("user_id", userId).eq("id", id).maybeSingle()) as ProfileRow | null; },
    async profileLabels(userId) { return (must(await sb.from("tax_profiles").select("label").eq("user_id", userId).eq("fy", FY).limit(600)) as { label: string }[]).map((r) => r.label); },
    async upsertProfile(userId, label, profile, computation) {
      return must(await sb.from("tax_profiles")
        .upsert({ user_id: userId, fy: FY, label, profile, computation }, { onConflict: "user_id,fy,label" })
        .select(PROFILE_COLS).single()) as ProfileRow;
    },
    async deleteProfile(userId, id) {
      const rows = must(await sb.from("tax_profiles").delete().eq("user_id", userId).eq("id", id).select("id")) as { id: string }[];
      return rows.length > 0;
    },

    async listWebhooks(userId) { return must(await sb.from("webhook_endpoints").select("*").eq("user_id", userId).order("created_at")) as WebhookEndpointRow[]; },
    async getWebhook(userId, id) { return must(await sb.from("webhook_endpoints").select("*").eq("user_id", userId).eq("id", id).maybeSingle()) as WebhookEndpointRow | null; },
    async getWebhookById(id) { return must(await sb.from("webhook_endpoints").select("*").eq("id", id).maybeSingle()) as WebhookEndpointRow | null; },
    async insertWebhook(row) { return must(await sb.from("webhook_endpoints").insert(row).select("*").single()) as WebhookEndpointRow; },
    async updateWebhook(userId, id, patch) { must(await sb.from("webhook_endpoints").update(patch).eq("user_id", userId).eq("id", id)); },
    async deleteWebhook(userId, id) {
      const rows = must(await sb.from("webhook_endpoints").delete().eq("user_id", userId).eq("id", id).select("id")) as { id: string }[];
      return rows.length > 0;
    },
    async webhooksForEvent(userId, event) {
      return must(await sb.from("webhook_endpoints").select("*").eq("user_id", userId).eq("active", true).contains("events", [event])) as WebhookEndpointRow[];
    },
    async insertDelivery(row) { return must(await sb.from("webhook_deliveries").insert(row).select("*").single()) as WebhookDeliveryRow; },
    async updateDelivery(id, patch) { must(await sb.from("webhook_deliveries").update(patch).eq("id", id)); },
    async listDeliveries(endpointId, limit) {
      return must(await sb.from("webhook_deliveries").select("*").eq("endpoint_id", endpointId).order("created_at", { ascending: false }).limit(limit)) as WebhookDeliveryRow[];
    },
    async retryableDeliveries(since, limit) {
      return must(await sb.from("webhook_deliveries").select("*").eq("status", "failed").lt("attempts", 6).gte("created_at", since).limit(limit)) as WebhookDeliveryRow[];
    },
  };
}

/** Production → Supabase; demo mode / tests → memory. */
export function getApiStore(): ApiStore {
  const sb = supabaseAdmin();
  return sb ? supabaseStore(sb) : memoryStore;
}
