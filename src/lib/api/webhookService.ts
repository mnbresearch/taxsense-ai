/** Webhook endpoint management shared by the API and the developer console. */
import { MAX_ENDPOINTS_PER_USER, WEBHOOK_EVENTS, checkWebhookUrl, deliver, endpointSecret, envelope, masterSecret, newSalt } from "./webhooks";
import type { ApiStore, WebhookEndpointRow } from "./store";

export function publicWebhook(e: WebhookEndpointRow) {
  return { id: e.id, url: e.url, events: e.events, active: e.active, createdAt: e.created_at };
}

export async function createWebhook(store: ApiStore, userId: string, body: { url?: unknown; events?: unknown }, resolve?: (h: string) => Promise<string[]>):
  Promise<{ ok: true; endpoint: WebhookEndpointRow; secret: string } | { ok: false; code: "invalid_request" | "conflict" | "unavailable"; message: string }> {
  if (!masterSecret()) return { ok: false, code: "unavailable", message: "Webhooks are not configured on this server." };
  const events = body?.events;
  const valid = Object.keys(WEBHOOK_EVENTS);
  if (!Array.isArray(events) || !events.length || events.some((e) => !valid.includes(e as string))) {
    return { ok: false, code: "invalid_request", message: `events must be a non-empty array of: ${valid.join(", ")}` };
  }
  const chk = await checkWebhookUrl(body?.url, resolve);
  if (!chk.ok) return { ok: false, code: "invalid_request", message: chk.message };
  const existing = await store.listWebhooks(userId);
  if (existing.length >= MAX_ENDPOINTS_PER_USER) return { ok: false, code: "conflict", message: `Up to ${MAX_ENDPOINTS_PER_USER} endpoints per account.` };
  const salt = newSalt();
  const endpoint = await store.insertWebhook({ user_id: userId, url: chk.url, events: [...new Set(events as string[])], secret_salt: salt, active: true });
  return { ok: true, endpoint, secret: endpointSecret(salt) };
}

export async function rotateWebhookSecret(store: ApiStore, userId: string, id: string): Promise<{ secret: string } | null> {
  const ep = await store.getWebhook(userId, id);
  if (!ep || !masterSecret()) return null;
  const salt = newSalt();
  await store.updateWebhook(userId, id, { secret_salt: salt });
  return { secret: endpointSecret(salt) };
}

export async function sendTestEvent(store: ApiStore, ep: WebhookEndpointRow, opts?: Parameters<typeof deliver>[3]) {
  const d = await store.insertDelivery({ endpoint_id: ep.id, event: "webhook.test", payload: {} });
  const payload = envelope("webhook.test", { message: "Test event from TaxSense AI" }, d.id);
  await store.updateDelivery(d.id, { payload });
  const outcome = await deliver(store, ep, { ...d, payload }, { delays: [0], ...(opts ?? {}) });
  const after = (await store.listDeliveries(ep.id, 50)).find((x) => x.id === d.id);
  return { deliveryId: d.id, outcome, httpStatus: after?.last_status ?? null, error: after?.last_error ?? null };
}
