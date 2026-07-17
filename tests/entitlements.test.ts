import { describe, expect, it } from "vitest";
import { PLAN_FEATURES, freeEntitlements, normalizePlan } from "@/lib/entitlements";

describe("normalizePlan", () => {
  it("maps pricing-page free text to plan ids", () => {
    expect(normalizePlan("Pro (₹399/mo or ₹3,999/yr)")).toBe("pro");
    expect(normalizePlan("Business (₹999/mo or ₹9,999/yr)")).toBe("business");
    expect(normalizePlan("Concierge (₹2,499/mo or ₹24,999/yr)")).toBe("concierge");
    expect(normalizePlan("Filed For You (₹4,999/return)")).toBe("filed");
  });
  it("treats an active row without a plan as Pro", () => {
    expect(normalizePlan(null)).toBe("pro");
    expect(normalizePlan("")).toBe("pro");
  });
  it("is case/whitespace tolerant", () => {
    expect(normalizePlan("  business monthly ")).toBe("business");
    expect(normalizePlan("PRO")).toBe("pro");
  });
});

describe("PLAN_FEATURES", () => {
  it("locks the CTC Designer on free and unlocks it on every paid plan", () => {
    expect(PLAN_FEATURES.free.ctcDesigner).toBe(false);
    (["pro", "business", "concierge", "filed"] as const).forEach((p) =>
      expect(PLAN_FEATURES[p].ctcDesigner).toBe(true)
    );
  });
  it("limits free PDFs and scenarios, unlimited on paid", () => {
    expect(PLAN_FEATURES.free.pdfPerDay).toBe(2);
    expect(PLAN_FEATURES.free.scenarios).toBe(1);
    expect(PLAN_FEATURES.pro.pdfPerDay).toBeNull();
    expect(PLAN_FEATURES.pro.scenarios).toBe(3);
  });
});

describe("freeEntitlements", () => {
  it("defaults to anonymous free tier", () => {
    const e = freeEntitlements();
    expect(e).toMatchObject({ signedIn: false, email: null, plan: "free", active: false });
    expect(e.features.ctcDesigner).toBe(false);
  });
});
