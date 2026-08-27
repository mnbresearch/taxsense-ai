/**
 * Batch 82 — Cashfree Payment Gateway integration (server-only).
 *
 * Webhook verification is written against the family-wide 2026-08-27
 * incident report ("Cashfree webhook 401 — millisecond timestamp bug"):
 *  - `x-webhook-timestamp` arrives in epoch MILLISECONDS (13 digits);
 *    the replay-window check normalises by magnitude BEFORE comparing,
 *  - the signature is computed over the RAW header string + RAW body bytes
 *    exactly as received (never the normalised value, never re-serialised JSON),
 *  - constant-time comparison, fail-CLOSED when the secret is unset,
 *  - MAX_AGE 15 minutes (Cashfree retries reuse the ORIGINAL timestamp and
 *    the retry schedule spans ~8+ minutes),
 *  - fulfilment is idempotent — a retry can never grant a plan twice.
 */
import { createHmac, timingSafeEqual } from "crypto";

/* ------------------------------ config ------------------------------ */

export function cashfreeConfigured(): boolean {
  return !!(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET);
}

export function cashfreeMode(): "production" | "sandbox" {
  return process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
}

function baseUrl(): string {
  return cashfreeMode() === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-version": "2023-08-01",
    "x-client-id": process.env.CASHFREE_CLIENT_ID ?? "",
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET ?? "",
  };
}

/* ----------------------------- catalog ------------------------------ */
/** Server-side price truth. The client only ever sends a key. */
export const PAY_CATALOG: Record<string, { amount: number; planLabel: string; blurb: string }> = {
  "pro-monthly":       { amount: 399,   planLabel: "Pro (₹399/mo — paid online)",        blurb: "Pro · 1 month" },
  "pro-yearly":        { amount: 3999,  planLabel: "Pro (₹3,999/yr — paid online)",      blurb: "Pro · 12 months" },
  "business-monthly":  { amount: 999,   planLabel: "Business (₹999/mo — paid online)",   blurb: "Business · 1 month" },
  "business-yearly":   { amount: 9999,  planLabel: "Business (₹9,999/yr — paid online)", blurb: "Business · 12 months" },
  "filed-once":        { amount: 4999,  planLabel: "Filed For You (₹4,999 — paid online)", blurb: "Filed For You · one return" },
  "concierge-monthly": { amount: 2499,  planLabel: "Concierge (₹2,499/mo — paid online)", blurb: "Concierge · 1 month" },
  "concierge-yearly":  { amount: 24999, planLabel: "Concierge (₹24,999/yr — paid online)", blurb: "Concierge · 12 months" },
};

/* --------------------------- order calls ---------------------------- */

export async function createCashfreeOrder(opts: {
  orderId: string;
  amount: number;
  email: string;
  phone: string;
  name?: string;
  planKey: string;
  returnUrl: string;
}): Promise<{ ok: true; paymentSessionId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${baseUrl()}/orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        order_id: opts.orderId,
        order_amount: opts.amount,
        order_currency: "INR",
        customer_details: {
          customer_id: opts.email.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50),
          customer_email: opts.email,
          customer_phone: opts.phone,
          customer_name: opts.name || undefined,
        },
        order_meta: { return_url: opts.returnUrl },
        order_note: opts.planKey,
        order_tags: { plan: opts.planKey },
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.payment_session_id)
      return { ok: false, error: String(d.message ?? `cashfree ${res.status}`).slice(0, 200) };
    return { ok: true, paymentSessionId: d.payment_session_id };
  } catch (e: any) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

export async function getCashfreeOrder(orderId: string): Promise<any | null> {
  try {
    const res = await fetch(`${baseUrl()}/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ------------------------ webhook verification ----------------------- */

export const WEBHOOK_MAX_AGE_SECONDS = 15 * 60;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Pure verifier — testable with a fixed clock.
 * Signature: base64(HMAC_SHA256(rawTimestampString + rawBody, secret)).
 */
export function verifyCashfreeWebhook(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string | null | undefined;
  nowMs?: number;
}): VerifyResult {
  const { rawBody, timestamp, signature, secret } = opts;
  const nowMs = opts.nowMs ?? Date.now();

  if (!secret) return { ok: false, reason: "secret not configured — failing closed" };
  if (!timestamp || !signature) return { ok: false, reason: "missing webhook headers" };

  const tsRaw = Number(timestamp);
  if (!Number.isFinite(tsRaw) || tsRaw <= 0) return { ok: false, reason: "malformed timestamp" };
  // >1e11 cannot be seconds (that would be year ~5138) → it is milliseconds.
  const tsSeconds = tsRaw > 1e11 ? tsRaw / 1000 : tsRaw;
  if (Math.abs(nowMs / 1000 - tsSeconds) > WEBHOOK_MAX_AGE_SECONDS)
    return { ok: false, reason: "timestamp outside replay window" };

  // Sign the RAW header string + RAW body — exactly as received.
  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return { ok: false, reason: "malformed signature" };
  }
  if (received.length !== expected.length) return { ok: false, reason: "signature mismatch" };
  if (!timingSafeEqual(received, expected)) return { ok: false, reason: "signature mismatch" };
  return { ok: true };
}
