import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const mk = (path: string, method: string, headers: Record<string, string> = {}) =>
  new NextRequest(`https://taxsense.mnbresearch.com${path}`, { method, headers: { host: "taxsense.mnbresearch.com", ...headers } });

describe("CSRF proxy", () => {
  it("allows same-origin POST", () => {
    expect(proxy(mk("/api/profile", "POST", { origin: "https://taxsense.mnbresearch.com" })).status).toBe(200);
  });
  it("blocks cross-origin POST", () => {
    expect(proxy(mk("/api/profile", "POST", { origin: "https://evil.example" })).status).toBe(403);
  });
  it("blocks Origin: null (sandboxed iframe / data: URL)", () => {
    expect(proxy(mk("/api/account", "DELETE", { origin: "null" })).status).toBe(403);
  });
  it("blocks cross-site fetch without Origin", () => {
    expect(proxy(mk("/api/profile", "POST", { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });
  it("allows GET from anywhere", () => {
    expect(proxy(mk("/api/health", "GET", { origin: "https://evil.example" })).status).toBe(200);
  });
  it("exempts the signed payment webhook and one-click unsubscribe", () => {
    expect(proxy(mk("/api/pay/webhook", "POST", { origin: "https://cashfree.com" })).status).toBe(200);
    expect(proxy(mk("/api/unsubscribe", "POST", { origin: "https://mail.google.com" })).status).toBe(200);
  });
});
