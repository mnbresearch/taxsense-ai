/**
 * Batch 82 — webhook verification tests.
 * Per the 2026-08-27 incident report, the signing tests use a GENUINE
 * 13-digit millisecond timestamp — hand-built seconds timestamps hide the bug.
 */
import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyCashfreeWebhook } from "../src/lib/cashfree";

const SECRET = "cf_test_secret_123";
const BODY = '{"data":{"order":{"order_id":"ts_abc","order_amount":399.00,"order_tags":{"plan":"pro-monthly"}},"payment":{"payment_status":"SUCCESS","cf_payment_id":885}, "customer_details":{"customer_email":"x@y.com"}},"type":"PAYMENT_SUCCESS_WEBHOOK"}';

const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(ts + body).digest("base64");

describe("cashfree webhook verification", () => {
  it("accepts a genuine 13-digit MILLISECOND timestamp (the production bug)", () => {
    const ts = "1787814895250"; // 13 digits — what Cashfree actually sends
    const now = Number(ts) + 60_000; // one minute after delivery
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY), secret: SECRET, nowMs: now });
    expect(v.ok).toBe(true);
  });

  it("still accepts a seconds timestamp (hand-built tests, older senders)", () => {
    const ts = "1787814895";
    const now = (Number(ts) + 60) * 1000;
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY), secret: SECRET, nowMs: now });
    expect(v.ok).toBe(true);
  });

  it("accepts a RETRY reusing the original ms timestamp 10 minutes later (15-min window)", () => {
    const ts = "1787814895250";
    const now = Number(ts) + 10 * 60_000;
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY), secret: SECRET, nowMs: now });
    expect(v.ok).toBe(true);
  });

  it("rejects outside the replay window", () => {
    const ts = "1787814895250";
    const now = Number(ts) + 20 * 60_000;
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY), secret: SECRET, nowMs: now });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/window/);
  });

  it("signature is over the RAW timestamp string — not the normalised seconds", () => {
    const ts = "1787814895250";
    const now = Number(ts) + 60_000;
    const wrong = sign(String(Number(ts) / 1000), BODY); // signed with normalised value
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: wrong, secret: SECRET, nowMs: now });
    expect(v.ok).toBe(false);
  });

  it("re-serialised JSON body breaks the signature (raw bytes only)", () => {
    const ts = "1787814895250";
    const now = Number(ts) + 60_000;
    const reserialised = JSON.stringify(JSON.parse(BODY)); // whitespace/order changes
    const v = verifyCashfreeWebhook({ rawBody: reserialised, timestamp: ts, signature: sign(ts, BODY), secret: SECRET, nowMs: now });
    expect(v.ok).toBe(false);
  });

  it("fails CLOSED when the secret is unset", () => {
    const ts = "1787814895250";
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY), secret: undefined, nowMs: Number(ts) + 1000 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/closed/);
  });

  it("rejects malformed timestamps and missing headers", () => {
    expect(verifyCashfreeWebhook({ rawBody: BODY, timestamp: "banana", signature: "x", secret: SECRET }).ok).toBe(false);
    expect(verifyCashfreeWebhook({ rawBody: BODY, timestamp: null, signature: "x", secret: SECRET }).ok).toBe(false);
    expect(verifyCashfreeWebhook({ rawBody: BODY, timestamp: "1787814895250", signature: null, secret: SECRET }).ok).toBe(false);
  });

  it("rejects a wrong-secret signature", () => {
    const ts = "1787814895250";
    const v = verifyCashfreeWebhook({ rawBody: BODY, timestamp: ts, signature: sign(ts, BODY, "other"), secret: SECRET, nowMs: Number(ts) + 1000 });
    expect(v.ok).toBe(false);
  });
});
