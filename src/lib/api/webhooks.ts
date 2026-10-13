/**
 * Outbound webhooks: signed, SSRF-guarded, retried.
 *
 * Signature (Stripe-style, replay-resistant):
 *   TaxSense-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>
 * Per-endpoint secret = "whsec_" + base64url(HMAC-SHA256(server master, salt)).
 * Only the salt is stored; rotating = new salt. The secret is shown once.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { supabaseConfigured } from "@/lib/supabase/server";
import type { ApiStore, WebhookDeliveryRow, WebhookEndpointRow } from "./store";

export const WEBHOOK_EVENTS = {
  "profile.saved": "A saved tax profile was created or updated",
  "profile.deleted": "A saved tax profile was deleted",
  "plan.activated": "A paid plan became active on your account (verified payment)",
} as const;
export type WebhookEvent = keyof typeof WEBHOOK_EVENTS | "webhook.test";
export const MAX_ENDPOINTS_PER_USER = 5;
const RETRY_DELAYS_MS = [0, 2_000, 8_000];
const TIMEOUT_MS = 8_000;

export function masterSecret(): string | null {
  const s = process.env.WEBHOOK_SIGNING_SECRET || process.env.UNSUBSCRIBE_SECRET;
  if (s) return s;
  return supabaseConfigured() ? null : "taxsense-demo-webhook-secret"; // demo/test mode only
}

export function newSalt(): string { return randomBytes(16).toString("hex"); }

export function endpointSecret(salt: string, master = masterSecret()): string {
  if (!master) throw new Error("webhook signing secret not configured");
  return "whsec_" + createHmac("sha256", master).update(salt).digest("base64url");
}

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

/** Reference verifier for receivers (also used in tests). Rejects > 5 min old. */
export function verifySignature(secret: string, body: string, header: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > toleranceSec || !parts.v1) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  const got = Buffer.from(parts.v1);
  return want.length === got.length && timingSafeEqual(want, got);
}

/* ------------------------------- SSRF guard ------------------------------- */
function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return privateV4(ip);
  if (v === 6) {
    const s = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return privateV4(mapped[1]);
    return s === "::" || s === "::1" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe8") || s.startsWith("fe9") ||
      s.startsWith("fea") || s.startsWith("feb") || s.startsWith("ff") || s.startsWith("64:ff9b");
  }
  return true;
}

/** Validate a receiver URL. `resolve` is injectable for tests. */
export async function checkWebhookUrl(
  raw: unknown,
  resolve: (host: string) => Promise<string[]> = async (h) => (await lookup(h, { all: true })).map((r) => r.address)
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (typeof raw !== "string" || raw.length > 500) return { ok: false, message: "url must be a string up to 500 characters" };
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, message: "url is not a valid URL" }; }
  if (u.protocol !== "https:") return { ok: false, message: "url must use https" };
  if (u.username || u.password) return { ok: false, message: "url must not contain credentials" };
  if (u.port && u.port !== "443") return { ok: false, message: "url must use port 443" };
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(local|internal|localhost|lan|home|corp)$/.test(host)) return { ok: false, message: "url host is not publicly routable" };
  // Never call ourselves (no loops, no hitting our own internal endpoints).
  if (host === "taxsense.mnbresearch.com" || /(^|\.)taxsense-ai[^.]*\.vercel\.app$/.test(host)) return { ok: false, message: "url must not point at TaxSense itself" };
  let addrs: string[];
  if (isIP(host)) addrs = [host];
  else {
    try { addrs = await resolve(host); } catch { return { ok: false, message: "url host does not resolve" }; }
  }
  if (!addrs.length || addrs.some(isPrivateAddress)) return { ok: false, message: "url resolves to a private or reserved address" };
  u.hash = "";
  return { ok: true, url: u.toString() };
}

/* -------------------------------- delivery -------------------------------- */
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function deliver(
  store: ApiStore, endpoint: WebhookEndpointRow, delivery: WebhookDeliveryRow,
  opts: { fetcher?: Fetcher; delays?: number[]; resolve?: (h: string) => Promise<string[]> } = {}
): Promise<"delivered" | "failed"> {
  const fetcher = opts.fetcher ?? ((u, i) => fetch(u, i));
  const delays = opts.delays ?? RETRY_DELAYS_MS;
  const body = JSON.stringify(delivery.payload);
  let attempts = delivery.attempts;
  let lastStatus: number | null = null;
  let lastError: string | null = null;
  for (const wait of delays) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    attempts += 1;
    // Re-check on every attempt (DNS can change after registration).
    const chk = await checkWebhookUrl(endpoint.url, opts.resolve);
    if (!chk.ok) { lastError = chk.message; break; }
    try {
      const secret = endpointSecret(endpoint.secret_salt);
      const res = await fetcher(chk.url, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "content-type": "application/json",
          "user-agent": "TaxSense-Webhooks/1.0",
          "taxsense-event": delivery.event,
          "taxsense-delivery": delivery.id,
          "taxsense-signature": sign(secret, body),
        },
        body,
      });
      lastStatus = res.status;
      if (res.status >= 200 && res.status < 300) {
        await store.updateDelivery(delivery.id, { status: "delivered", attempts, last_status: res.status, last_error: null, delivered_at: new Date().toISOString() });
        return "delivered";
      }
      lastError = res.status >= 300 && res.status < 400 ? "redirects are not followed" : `HTTP ${res.status}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break; // receiver rejected — don't hammer
    } catch (e) {
      lastError = (e as Error)?.name === "TimeoutError" ? "timeout" : "network error";
    }
  }
  await store.updateDelivery(delivery.id, { status: "failed", attempts, last_status: lastStatus, last_error: lastError });
  return "failed";
}

export function envelope(event: WebhookEvent, data: Record<string, unknown>, id: string) {
  return { id, type: event, created: new Date().toISOString(), apiVersion: "v1", data };
}

/** Queue + deliver an event to all of a user's subscribed endpoints. Never throws. */
export async function emitWebhook(store: ApiStore, userId: string, event: Exclude<WebhookEvent, "webhook.test">, data: Record<string, unknown>) {
  try {
    if (!masterSecret()) return;
    const hooks = await store.webhooksForEvent(userId, event);
    await Promise.all(hooks.map(async (h) => {
      const d = await store.insertDelivery({ endpoint_id: h.id, event, payload: {} });
      const payload = envelope(event, data, d.id);
      await store.updateDelivery(d.id, { payload });
      await deliver(store, h, { ...d, payload });
    }));
  } catch (e) {
    console.error("webhook emit failed", (e as Error)?.message);
  }
}

/** Cron: one more pass over recent failures. */
export async function retryFailedDeliveries(store: ApiStore, limit = 50): Promise<{ retried: number; delivered: number }> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const rows = await store.retryableDeliveries(since, limit);
  let delivered = 0;
  for (const d of rows) {
    const ep = await store.getWebhookById(d.endpoint_id);
    if (!ep || !ep.active) continue;
    if ((await deliver(store, ep, d, { delays: [0] })) === "delivered") delivered++;
  }
  return { retried: rows.length, delivered };
}
