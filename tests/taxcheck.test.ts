/** Batch 93 — lead-magnet quick check sanity. */
import { describe, expect, it } from "vitest";
import { quickCheck } from "../src/lib/taxcheck";

describe("60-second tax check", () => {
  it("₹12L, no deductions → new regime, zero tax, no overpay when already on new", () => {
    const r = quickCheck({ income: 1_200_000, rentMonthly: 0, metro: false, ded80C: 0, currentRegime: "new" });
    expect(r.recommended).toBe("new");
    expect(r.newTax).toBe(0);
    expect(r.overpayingNow).toBe(0);
  });
  it("₹18L on OLD regime with no deductions → real overpayment detected", () => {
    const r = quickCheck({ income: 1_800_000, rentMonthly: 0, metro: false, ded80C: 0, currentRegime: "old" });
    expect(r.recommended).toBe("new");
    expect(r.overpayingNow).toBeGreaterThan(50_000);
  });
  it("moves saving is non-negative and counted once", () => {
    const r = quickCheck({ income: 2_400_000, rentMonthly: 40_000, metro: true, ded80C: 50_000, currentRegime: "unsure" });
    expect(r.movesSaving).toBeGreaterThanOrEqual(0);
    expect(r.totalOpportunity).toBe(r.overpayingNow + r.movesSaving);
  });
  it("unsure regime → no false 'overpaying' claim", () => {
    const r = quickCheck({ income: 1_500_000, rentMonthly: 0, metro: false, ded80C: 150_000, currentRegime: "unsure" });
    expect(r.overpayingNow).toBe(0);
  });
});
