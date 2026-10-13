import { describe, it, expect, beforeEach } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { generateKey, parseKey, hashSecret, secretMatches, ALL_SCOPES, SCOPES } from "@/lib/api/keys";
import { memoryStore, resetMemoryStore, setMemoryUserEmail } from "@/lib/api/store";
import { createKey, revokeKey, rotateKey, listKeys, type Actor } from "@/lib/api/keyService";
import { openApiSpec } from "@/lib/api/openapi";
import { GET as me } from "@/app/api/v1/me/route";
import { POST as compute } from "@/app/api/v1/compute/route";
import { POST as parseDoc } from "@/app/api/v1/documents/parse/route";
import { GET as deadlines } from "@/app/api/v1/deadlines/route";
import { GET as listProfiles, POST as saveProfileRoute } from "@/app/api/v1/profiles/route";
import { GET as getProfile, DELETE as deleteProfile } from "@/app/api/v1/profiles/[id]/route";
import { GET as health } from "@/app/api/v1/health/route";

const A: Actor = { userId: "11111111-1111-4111-8111-111111111111", isAdmin: false };
const B: Actor = { userId: "22222222-2222-4222-8222-222222222222", isAdmin: false };
const ADMIN: Actor = { userId: "33333333-3333-4333-8333-333333333333", isAdmin: true };
const BASE = "https://taxsense.test/api/v1";

function req(url: string, key: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (key) headers.set("authorization", `Bearer ${key}`);
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`${BASE}${url}`, { ...init, headers });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function newKey(actor: Actor, scopes: string[], extra: Record<string, unknown> = {}) {
  const r = await createKey(memoryStore, actor, { name: "t", scopes, ...extra });
  if (!r.ok) throw new Error(r.err.message);
  return r;
}

const HERO_PROFILE = {
  age: 32, residentialStatus: "resident", houseProperties: [],
  salary: { grossSalary: 1800000, basicPlusDA: 900000, hraReceived: 360000, rentPaid: 420000, isMetroCity: true, professionalTax: 2500, employerNpsContribution: 0 },
  deductions: { section80C: 150000, section80D_selfFamily: 25000 }, taxesPaid: 0,
};

beforeEach(() => {
  resetMemoryStore();
  setMemoryUserEmail(A.userId, "a@example.org");
  setMemoryUserEmail(B.userId, "b@example.org");
});

describe("key format & hashing", () => {
  it("generates 256-bit secrets in the documented format, unique every time", () => {
    const k = generateKey();
    expect(k.fullKey).toMatch(/^tsk_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(k.secret, "base64url").length).toBe(32);
    expect(generateKey().fullKey).not.toBe(k.fullKey);
    expect(parseKey(k.fullKey)).toEqual({ keyId: k.keyId, secret: k.secret });
  });
  it("stores only a hash and verifies in constant time", () => {
    const k = generateKey();
    expect(k.secretHash).toBe(hashSecret(k.secret));
    expect(k.secretHash).not.toContain(k.secret);
    expect(secretMatches(k.secret, k.secretHash)).toBe(true);
    expect(secretMatches(k.secret.slice(0, -1) + "A", k.secretHash)).toBe(false);
  });
  it("rejects malformed keys", () => {
    for (const bad of ["", "tsk_", "Bearer x", "tsk_zzzzzzzzzzzzzzzz_" + "a".repeat(43), "tsk_0123456789abcdef_short"]) expect(parseKey(bad)).toBeNull();
  });
});

describe("key lifecycle", () => {
  it("validates name, scopes and expiry", async () => {
    expect((await createKey(memoryStore, A, { name: "", scopes: ["compute"] })).ok).toBe(false);
    expect((await createKey(memoryStore, A, { name: "x", scopes: [] })).ok).toBe(false);
    expect((await createKey(memoryStore, A, { name: "x", scopes: ["admin"] })).ok).toBe(false);
    expect((await createKey(memoryStore, A, { name: "x", scopes: ["compute"], expiresInDays: 0 })).ok).toBe(false);
    expect((await createKey(memoryStore, A, { name: "x", scopes: ["compute"], expiresInDays: 366 })).ok).toBe(false);
    expect((await createKey(memoryStore, A, { name: "x", scopes: ["compute"], expiresInDays: 30 })).ok).toBe(true);
  });
  it("only admins create service keys, and service keys can't hold user-data scopes", async () => {
    const r1 = await createKey(memoryStore, A, { name: "svc", scopes: ["compute"], kind: "service" });
    expect(r1.ok || r1.err.code).toBe("forbidden");
    const r2 = await createKey(memoryStore, ADMIN, { name: "svc", scopes: ["profiles:read"], kind: "service" });
    expect(r2.ok).toBe(false);
    expect((await createKey(memoryStore, ADMIN, { name: "svc", scopes: ["compute"], kind: "service" })).ok).toBe(true);
  });
  it("caps active keys per user at 10", async () => {
    for (let i = 0; i < 10; i++) await newKey(A, ["compute"]);
    const r = await createKey(memoryStore, A, { name: "11th", scopes: ["compute"] });
    expect(r.ok).toBe(false);
  });
  it("lists metadata only (never the hash) and users only see their own keys", async () => {
    await newKey(A, ["compute"]);
    const listA = await listKeys(memoryStore, A);
    expect(listA).toHaveLength(1);
    expect(JSON.stringify(listA)).not.toContain("secret_hash");
    expect(await listKeys(memoryStore, B)).toHaveLength(0);
  });
  it("users cannot revoke or rotate someone else's key", async () => {
    const k = await newKey(A, ["compute"]);
    expect((await revokeKey(memoryStore, B, k.key.id)).ok).toBe(false);
    expect((await rotateKey(memoryStore, B, k.key.id, 0)).ok).toBe(false);
    expect((await revokeKey(memoryStore, B, "not-a-uuid")).ok).toBe(false);
  });
});

describe("authentication on /api/v1", () => {
  it("accepts a valid key and reports scopes + limits", async () => {
    const k = await newKey(A, ["compute", "deadlines:read"]);
    const r = await me(req("/me", k.secret));
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.data.scopes).toEqual(["compute", "deadlines:read"]);
    expect(d.data.rateLimits.perMinute).toBe(30);
    expect(r.headers.get("x-request-id")).toBeTruthy();
  });
  it("rejects missing, malformed and wrong keys with 401", async () => {
    expect((await me(req("/me", null))).status).toBe(401);
    expect((await me(req("/me", "tsk_garbage"))).status).toBe(401);
    const k = await newKey(A, ["compute"]);
    const wrong = k.secret.slice(0, -1) + (k.secret.endsWith("A") ? "B" : "A");
    const r = await me(req("/me", wrong));
    expect(r.status).toBe(401);
    expect((await r.json()).error.code).toBe("unauthorized");
  });
  it("rejects expired keys", async () => {
    const k = await newKey(A, ["compute"]);
    await memoryStore.updateKey(k.key.id, { expires_at: new Date(Date.now() - 1000).toISOString() });
    const r = await me(req("/me", k.secret));
    expect(r.status).toBe(401);
    expect((await r.json()).error.message).toMatch(/expired/);
  });
  it("revocation takes effect immediately", async () => {
    const k = await newKey(A, ["compute"]);
    expect((await me(req("/me", k.secret))).status).toBe(200);
    await revokeKey(memoryStore, A, k.key.id);
    expect((await me(req("/me", k.secret))).status).toBe(401);
  });
  it("enforces scopes with 403", async () => {
    const k = await newKey(A, ["deadlines:read"]);
    const r = await compute(req("/compute", k.secret, { method: "POST", body: JSON.stringify({ profile: HERO_PROFILE }) }));
    expect(r.status).toBe(403);
    expect((await r.json()).error.code).toBe("forbidden");
  });
  it("rotation with no overlap kills the old key; the new one works", async () => {
    const k = await newKey(A, ["compute"]);
    const rot = await rotateKey(memoryStore, A, k.key.id, 0);
    if (!rot.ok) throw new Error("rotate failed");
    expect((await me(req("/me", k.secret))).status).toBe(401);
    expect((await me(req("/me", rot.secret))).status).toBe(200);
    expect(rot.key.rotated_from).toBe(k.key.id);
  });
  it("rotation with overlap keeps the old key working until it retires", async () => {
    const k = await newKey(A, ["compute"]);
    const rot = await rotateKey(memoryStore, A, k.key.id, 2);
    if (!rot.ok) throw new Error("rotate failed");
    expect((await me(req("/me", k.secret))).status).toBe(200);
    expect((await rotateKey(memoryStore, A, k.key.id, 25)).ok).toBe(false);
  });
  it("rate-limits per key (free: 30/min)", async () => {
    const k = await newKey(A, ["deadlines:read"]);
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await deadlines(req("/deadlines", k.secret))).status;
    expect(last).toBe(429);
  });
  it("records usage and last-used time", async () => {
    const k = await newKey(A, ["deadlines:read"]);
    await deadlines(req("/deadlines", k.secret));
    await deadlines(req("/deadlines", k.secret));
    const [row] = await listKeys(memoryStore, A);
    expect(row.requests30d).toBe(2);
    expect(row.last_used_at).toBeTruthy();
  });
});

describe("endpoints", () => {
  it("computes the verified hero example", async () => {
    const k = await newKey(A, ["compute"]);
    const r = await compute(req("/compute", k.secret, { method: "POST", body: JSON.stringify({ profile: HERO_PROFILE }) }));
    expect(r.status).toBe(200);
    const d = (await r.json()).data;
    expect(d.regimes.old.totalTax).toBe(192660);
    expect(d.regimes.new.totalTax).toBe(150800);
    expect(d.recommendedRegime).toBe("new");
    expect(d.savingsVsOtherRegime).toBe(41860);
  });
  it("validates bodies (missing profile 400, bad JSON 400, oversize 413)", async () => {
    const k = await newKey(A, ["compute"]);
    expect((await compute(req("/compute", k.secret, { method: "POST", body: JSON.stringify({}) }))).status).toBe(400);
    expect((await compute(req("/compute", k.secret, { method: "POST", body: "{nope" }))).status).toBe(400);
    expect((await compute(req("/compute", k.secret, { method: "POST", body: JSON.stringify({ profile: HERO_PROFILE, pad: "x".repeat(110_000) }) }))).status).toBe(413);
  });
  it("parses Form 16 text without returning identity numbers", async () => {
    const k = await newKey(A, ["documents:parse"]);
    const text = "FORM NO. 16 PART B\nPAN of the Employee: ABCPK1234L\nSalary as per provisions contained in section 17(1) 18,00,000.00\nDeduction under section 80C 1,50,000.00";
    const r = await parseDoc(req("/documents/parse", k.secret, { method: "POST", body: JSON.stringify({ text }) }));
    const raw = await r.text();
    expect(r.status).toBe(200);
    expect(raw).not.toContain("ABCPK1234L");
    expect(JSON.parse(raw).data.partialProfile.salary.grossSalary).toBe(1800000);
  });
  it("validates deadline queries", async () => {
    const k = await newKey(A, ["deadlines:read"]);
    expect((await deadlines(req("/deadlines?from=2026-01-01&limit=3", k.secret))).status).toBe(200);
    expect((await deadlines(req("/deadlines?from=yesterday", k.secret))).status).toBe(400);
    expect((await deadlines(req("/deadlines?limit=500", k.secret))).status).toBe(400);
  });
  it("health is public", async () => {
    const r = await health();
    expect(r.status).toBe(200);
    expect((await r.json()).apiVersion).toBe("v1");
  });
});

describe("profiles: tenant isolation", () => {
  it("one user's key can never read, list or delete another user's profiles", async () => {
    const ka = await newKey(A, ["profiles:read", "profiles:write"]);
    const kb = await newKey(B, ["profiles:read", "profiles:write"]);
    const created = await saveProfileRoute(req("/profiles", ka.secret, { method: "POST", body: JSON.stringify({ label: "Mine", profile: HERO_PROFILE }) }));
    expect(created.status).toBe(201);
    const id = (await created.json()).data.id;
    expect((await getProfile(req(`/profiles/${id}`, kb.secret), params(id))).status).toBe(404);
    expect((await (await listProfiles(req("/profiles", kb.secret))).json()).data.items).toHaveLength(0);
    expect((await deleteProfile(req(`/profiles/${id}`, kb.secret, { method: "DELETE" }), params(id))).status).toBe(404);
    const own = await getProfile(req(`/profiles/${id}`, ka.secret), params(id));
    expect(own.status).toBe(200);
    expect((await own.json()).data.summary.recommendedRegime).toBe("new");
  });
  it("service keys are refused on user data", async () => {
    const svc = await createKey(memoryStore, ADMIN, { name: "svc", scopes: ["compute"], kind: "service" });
    if (!svc.ok) throw new Error();
    // even if a service key somehow carried the scope, requireUserKey blocks it
    await memoryStore.updateKey(svc.key.id, {});
    const row = await memoryStore.getKey(svc.key.id);
    row!.scopes.push("profiles:read");
    expect((await listProfiles(req("/profiles", svc.secret))).status).toBe(403);
  });
  it("is idempotent per label, paginates with a cursor, and enforces the plan cap", async () => {
    const k = await newKey(A, ["profiles:read", "profiles:write"]);
    const body = (label: string) => ({ method: "POST", body: JSON.stringify({ label, profile: HERO_PROFILE }) });
    expect((await saveProfileRoute(req("/profiles", k.secret, body("One")))).status).toBe(201);
    expect((await saveProfileRoute(req("/profiles", k.secret, body("One")))).status).toBe(200); // same label → update
    expect((await saveProfileRoute(req("/profiles", k.secret, body("Two")))).status).toBe(201);
    expect((await saveProfileRoute(req("/profiles", k.secret, body("Three")))).status).toBe(402); // free: 2 profiles
    const p1 = await (await listProfiles(req("/profiles?limit=1", k.secret))).json();
    expect(p1.data.items).toHaveLength(1);
    expect(p1.data.nextCursor).toBeTruthy();
    const p2 = await (await listProfiles(req(`/profiles?limit=1&cursor=${p1.data.nextCursor}`, k.secret))).json();
    expect(p2.data.items).toHaveLength(1);
    expect(p2.data.items[0].id).not.toBe(p1.data.items[0].id);
    expect((await listProfiles(req("/profiles?cursor=bogus", k.secret))).status).toBe(400);
  });
});

describe("OpenAPI document", () => {
  const spec = openApiSpec();
  it("documents every scope and only routes that exist", () => {
    expect(spec.components.securitySchemes.apiKey.description).toContain(ALL_SCOPES[0]);
    for (const p of Object.keys(spec.paths)) {
      const file = path.join("src/app/api/v1", p.replace(/\{(\w+)\}/g, "[$1]"), "route.ts");
      expect(existsSync(file), `${p} → ${file}`).toBe(true);
    }
    for (const s of Object.keys(SCOPES)) expect(JSON.stringify(spec.paths)).toContain(s);
  });
});
