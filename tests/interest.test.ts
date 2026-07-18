import { describe, expect, it } from "vitest";
import { computeInterest234 } from "@/lib/tax-engine/interest";

const base = {
  assessedTax: 500_000,
  tdsCredits: 0,
  advanceByQuarter: [75_000, 225_000, 375_000, 500_000] as [number, number, number, number],
  monthsLateFiling: 0,
  monthsTo234BSettlement: 4,
};

describe("s.234 interest module (Batch 35)", () => {
  it("perfect payer owes nothing", () => {
    const r = computeInterest234(base);
    expect(r.total).toBe(0);
    expect(r.i234B_applicable).toBe(false);
  });

  it("234A: 1%/mo on unpaid tax, months rounded up", () => {
    const r = computeInterest234({ ...base, advanceByQuarter: [0, 0, 0, 0], monthsLateFiling: 2.2 });
    // unpaid 5,00,000 → 1% × 3 months = 15,000
    expect(r.i234A).toBe(15_000);
  });

  it("234B: applies when credits < 90% of assessed", () => {
    const r = computeInterest234({ ...base, advanceByQuarter: [0, 0, 0, 400_000] });
    // 400k / 500k = 80% < 90% → shortfall 100,000 × 1% × 4 = 4,000
    expect(r.i234B_applicable).toBe(true);
    expect(r.i234B).toBe(4_000);
  });

  it("234B: safe when credits ≥ 90%", () => {
    const r = computeInterest234({ ...base, advanceByQuarter: [0, 0, 0, 450_000] });
    expect(r.i234B_applicable).toBe(false);
    expect(r.i234B).toBe(0);
  });

  it("234C: full default = 3+3+3+1 months on the schedule", () => {
    const r = computeInterest234({ ...base, advanceByQuarter: [0, 0, 0, 0] });
    // 15%×3mo + 45%×3mo + 75%×3mo + 100%×1mo on 5,00,000, ₹100-rounded
    const expected = Math.round(75_000 * 0.03) + Math.round(225_000 * 0.03) + Math.round(375_000 * 0.03) + Math.round(500_000 * 0.01);
    expect(r.i234C).toBe(expected);
    expect(r.i234C_rows.length).toBe(4);
  });

  it("234C: 12%/36% safe harbour spares small June/Sep shortfalls", () => {
    // paid exactly 12% and 36% — within the proviso, no interest for Q1/Q2
    const r = computeInterest234({ ...base, advanceByQuarter: [60_000, 180_000, 375_000, 500_000] });
    expect(r.i234C_rows[0].interest).toBe(0);
    expect(r.i234C_rows[1].interest).toBe(0);
    expect(r.i234C).toBe(0);
  });

  it("234C: skipped entirely when net liability < ₹10,000", () => {
    const r = computeInterest234({ ...base, assessedTax: 9_000, advanceByQuarter: [0, 0, 0, 0] });
    expect(r.i234C).toBe(0);
    expect(r.i234C_rows.length).toBe(0);
  });

  it("presumptive payers face a single 15 Mar installment", () => {
    const r = computeInterest234({ ...base, presumptive: true, advanceByQuarter: [0, 0, 0, 0] });
    expect(r.i234C_rows.length).toBe(1);
    expect(r.i234C).toBe(Math.round(500_000 * 0.01));
  });

  it("TDS reduces the net liability for every section", () => {
    const r = computeInterest234({ ...base, tdsCredits: 500_000, advanceByQuarter: [0, 0, 0, 0], monthsLateFiling: 5 });
    expect(r.netTaxDue).toBe(0);
    expect(r.total).toBe(0);
  });
});
