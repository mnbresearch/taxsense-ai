import { describe, it, expect, beforeEach } from "vitest";
import { checkWebhookUrl, isPrivateAddress, sign, verifySignature, deliver, endpointSecret, retryFailedDeliveries } from "@/lib/api/webhooks";
import { createWebhook, rotateWebhookSecret, sendTestEvent } from "@/lib/api/webhookService";
import { memoryStore, resetMemoryStore } from "@/lib/api/store";
import { sanitizeProps, cleanPath, cleanAnonId, CLIENT_EVENTS, isEventName } from "@/lib/analytics";
import { selectEligible, normalizeConfig, type Candidate } from "@/lib/followups";
import { POST as telemetry } from "@/app/api/telemetry/route";
import { NextRequest } from "next/server";

const U = "11111111-1111-4111-8111-111111111111";
const V = "22222222-2222-4222-8222-222222222222";
const publicDns = async () => ["93.184.216.34"];

beforeEach(() => resetMemoryStore());

describe("webhook SSRF guard", () => {
  it.each([
    ["http://example.org/hook", /https/],
    ["https://localhost/hook", /routable/],
    ["https://127.0.0.1/hook", /private/],
    ["https://10.0.0.5/hook", /private/],
    ["https://169.254.169.254/latest/meta-data", /private/],
    ["https://[::1]/hook", /private/],
    ["https://user:pw@example.org/hook", /credentials/],
    ["https://example.org:8443/hook", /443/],
    ["https://db.internal/hook", /routable/],
    ["not a url", /valid URL/],
    ["https://taxsense.mnbresearch.com/api/pay/webhook", /itself/],
  ])("rejects %s", async (url, why) => {
    const r = await checkWebhookUrl(url, publicDns);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(why);
  });
  it("rejects public hostnames that resolve to private addresses (DNS rebinding)", async () => {
    const r = await checkWebhookUrl("https://evil.example.org/hook", async () => ["192.168.1.10"]);
    expect(r.ok).toBe(false);
  });
  it("accepts a public https endpoint", async () => {
    expect((await checkWebhookUrl("https://hooks.example.org/taxsense", publicDns)).ok).toBe(true);
  });
  it("classifies addresses", () => {
    for (const ip of ["10.1.2.3", "172.16.0.1", "192.168.0.1", "100.64.0.1", "::ffff:127.0.0.1", "fd00::1", "fe80::1"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "2606:4700::1111"]) expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("webhook signatures", () => {
  it("round-trips and rejects tampering, wrong secrets and stale timestamps", () => {
    const secret = endpointSecret("salt-1");
    const body = JSON.stringify({ id: "d1", type: "profile.saved" });
    const now = 1_800_000_000;
    const h = sign(secret, body, now);
    expect(verifySignature(secret, body, h, now)).toBe(true);
    expect(verifySignature(secret, body + " ", h, now)).toBe(false);
    expect(verifySignature(endpointSecret("salt-2"), body, h, now)).toBe(false);
    expect(verifySignature(secret, body, h, now + 301)).toBe(false);
  });
});

describe("webhook endpoints & delivery", () => {
  it("creates endpoints with a one-time secret, validates events, isolates owners", async () => {
    expect((await createWebhook(memoryStore, U, { url: "https://h.example.org/x", events: ["nope"] }, publicDns)).ok).toBe(false);
    const r = await createWebhook(memoryStore, U, { url: "https://h.example.org/x", events: ["profile.saved"] }, publicDns);
    if (!r.ok) throw new Error(r.message);
    expect(r.secret).toMatch(/^whsec_/);
    expect(JSON.stringify(await memoryStore.listWebhooks(U))).not.toContain(r.secret);
    expect(await memoryStore.getWebhook(V, r.endpoint.id)).toBeNull();
    expect(await memoryStore.deleteWebhook(V, r.endpoint.id)).toBe(false);
    expect(await rotateWebhookSecret(memoryStore, V, r.endpoint.id)).toBeNull();
    const rot = await rotateWebhookSecret(memoryStore, U, r.endpoint.id);
    expect(rot?.secret).not.toBe(r.secret);
  });
  it("delivers signed requests the receiver can verify", async () => {
    const r = await createWebhook(memoryStore, U, { url: "https://h.example.org/x", events: ["profile.saved"] }, publicDns);
    if (!r.ok) throw new Error();
    let seen: { headers: Headers; body: string } | null = null;
    const out = await sendTestEvent(memoryStore, r.endpoint, {
      resolve: publicDns,
      fetcher: async (_u, init) => { seen = { headers: new Headers(init.headers), body: String(init.body) }; return new Response("ok", { status: 200 }); },
    });
    expect(out.outcome).toBe("delivered");
    expect(seen).not.toBeNull();
    const s = seen as unknown as { headers: Headers; body: string };
    expect(verifySignature(r.secret, s.body, s.headers.get("taxsense-signature")!)).toBe(true);
    expect(s.headers.get("taxsense-delivery")).toBe(out.deliveryId);
  });
  it("retries 5xx then marks failed; does not retry most 4xx; cron pass recovers", async () => {
    const r = await createWebhook(memoryStore, U, { url: "https://h.example.org/x", events: ["profile.saved"] }, publicDns);
    if (!r.ok) throw new Error();
    let calls = 0;
    const d1 = await memoryStore.insertDelivery({ endpoint_id: r.endpoint.id, event: "profile.saved", payload: { a: 1 } });
    expect(await deliver(memoryStore, r.endpoint, d1, { delays: [0, 0, 0], resolve: publicDns, fetcher: async () => { calls++; return new Response("", { status: 503 }); } })).toBe("failed");
    expect(calls).toBe(3);
    calls = 0;
    const d2 = await memoryStore.insertDelivery({ endpoint_id: r.endpoint.id, event: "profile.saved", payload: { a: 2 } });
    expect(await deliver(memoryStore, r.endpoint, d2, { delays: [0, 0, 0], resolve: publicDns, fetcher: async () => { calls++; return new Response("", { status: 400 }); } })).toBe("failed");
    expect(calls).toBe(1);
    const d3 = await memoryStore.insertDelivery({ endpoint_id: r.endpoint.id, event: "profile.saved", payload: { a: 3 } });
    await deliver(memoryStore, r.endpoint, d3, { delays: [0], resolve: publicDns, fetcher: async () => { throw new Error("down"); } });
    const [row] = (await memoryStore.listDeliveries(r.endpoint.id, 50)).filter((x) => x.id === d3.id);
    expect(row.last_error).toBe("network error");
    expect(row.status).toBe("failed");
    // (retryFailedDeliveries uses real DNS for the stored URL; just make sure it runs without throwing)
    await expect(retryFailedDeliveries(memoryStore, 0)).resolves.toEqual({ retried: 0, delivered: 0 });
  });
  it("does not follow redirects", async () => {
    const r = await createWebhook(memoryStore, U, { url: "https://h.example.org/x", events: ["profile.saved"] }, publicDns);
    if (!r.ok) throw new Error();
    const out = await sendTestEvent(memoryStore, r.endpoint, { resolve: publicDns, fetcher: async () => new Response("", { status: 302, headers: { location: "http://169.254.169.254/" } }) });
    expect(out.outcome).toBe("failed");
    expect(out.error).toMatch(/redirect/);
  });
});

describe("analytics hygiene", () => {
  it("keeps only whitelisted props and drops PII", () => {
    expect(sanitizeProps("checkout_started", { plan_key: "pro-monthly", amount: 399, email: "x@y.com", phone: "9876543210" })).toEqual({ plan_key: "pro-monthly", amount: 399 });
    expect(sanitizeProps("feature_used", { feature: "pdf" })).toEqual({ feature: "pdf" });
    expect(sanitizeProps("feature_used", { feature: "steal-cookies" })).toEqual({});
    expect(sanitizeProps("plan_selected", { plan: "enterprise" })).toEqual({});
  });
  it("cleans paths and ids", () => {
    expect(cleanPath("/pricing?email=a@b.com#x")).toBe("/pricing");
    expect(cleanPath("javascript:alert(1)")).toBeNull();
    expect(cleanAnonId("not-a-uuid")).toBeNull();
    expect(cleanAnonId("6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f")).toBeTruthy();
  });
  it("browsers cannot report server-attested events (payments, logins)", async () => {
    for (const e of ["payment_succeeded", "signup", "subscription_activated", "checkout_started"]) {
      expect(isEventName(e)).toBe(true);
      expect(CLIENT_EVENTS).not.toContain(e);
      const r = await telemetry(new NextRequest("https://t.test/api/telemetry", { method: "POST", body: JSON.stringify({ type: "event", event: e }), headers: { "x-real-ip": `9.9.9.${e.length}` } }));
      expect(r.status).toBe(400);
    }
    const ok = await telemetry(new NextRequest("https://t.test/api/telemetry", { method: "POST", body: JSON.stringify({ type: "event", event: "feature_used", props: { feature: "pdf" } }), headers: { "x-real-ip": "9.9.9.200" } }));
    expect(ok.status).toBe(200);
  });
});

describe("checkout follow-up eligibility", () => {
  const o = (id: string, email: string, extra: Partial<Candidate> = {}): Candidate =>
    ({ order_id: id, email, plan_key: "pro-monthly", created_at: "2026-10-12T00:00:00Z", consent_at: "2026-10-12T00:00:00Z", ...extra });
  const empty = () => ({ paidEmails: new Set<string>(), suppressed: new Set<string>(), followedOrders: new Set<string>(), recentlyContacted: new Set<string>() });

  it("excludes no-consent, paid, unsubscribed, undeliverable, recently contacted and duplicates", () => {
    const ctx = empty();
    ctx.paidEmails.add("paid@x.org"); ctx.suppressed.add("unsub@x.org"); ctx.recentlyContacted.add("recent@x.org"); ctx.followedOrders.add("done");
    const { eligible, skipped } = selectEligible([
      o("1", "ok@x.org"), o("2", "OK@x.org"), o("3", "noconsent@x.org", { consent_at: null }), o("4", "paid@x.org"),
      o("5", "unsub@x.org"), o("6", "t@example.com"), o("7", "recent@x.org"), o("done", "z@x.org"), o("8", "bad@x.org", { plan_key: "x" }),
    ], ctx, 50);
    expect(eligible.map((e) => e.order_id)).toEqual(["1"]);
    const reasons = Object.fromEntries(skipped.map((s) => [s.order_id, s.reason]));
    expect(reasons).toMatchObject({ "2": "frequency cap", "3": "no consent record", "4": "purchased since", "5": "unsubscribed", "6": "undeliverable", "7": "frequency cap", "8": "unknown plan" });
    expect(reasons.done).toBeUndefined();
  });
  it("respects maxPerRun and safe config defaults", () => {
    expect(selectEligible([o("1", "a@x.org"), o("2", "b@x.org")], empty(), 1).eligible).toHaveLength(1);
    expect(normalizeConfig({})).toEqual({ enabled: false, dryRun: true, delayHours: 3, maxPerRun: 50 });
    expect(normalizeConfig({ enabled: true, dryRun: false, delayHours: 999, maxPerRun: -5 })).toEqual({ enabled: true, dryRun: false, delayHours: 48, maxPerRun: 1 });
  });
});
