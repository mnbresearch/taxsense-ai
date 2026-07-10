/** Tax Jar + notice-decoder tests (feature batch 9). */
import { describe, expect, it } from "vitest";
import { taxJar } from "../src/lib/optimizer/taxjar";
import { glossaryAnswer } from "../src/lib/glossary";

describe("tax jar", () => {
  it("freelancer on 44ADA: projects, taxes at 50%, and splits set-aside over remaining months", () => {
    // ₹7L in 6 months → ₹14L projected → ₹7L taxable → new regime near-zero tax zone
    const r = taxJar({ receiptsToDate: 700_000, monthsElapsed: 6, kind: "professional", presumptive: true });
    expect(r.projectedAnnualReceipts).toBe(1_400_000);
    expect(r.projectedTaxableIncome).toBe(700_000);
    expect(r.monthsLeft).toBe(6);
    expect(r.projectedTax).toBe(0); // ≤12L → 87A rebate
    expect(r.setAsidePerMonth).toBe(0);
  });

  it("bigger freelancer: set-aside × months covers remaining tax; jar rate sane", () => {
    // ₹18L in 6 months → 36L projected → 18L taxable
    const r = taxJar({ receiptsToDate: 1_800_000, monthsElapsed: 6, kind: "professional", presumptive: true });
    expect(r.projectedTax).toBe(166_400); // 18L taxable, new regime: 1,60,000 × 1.04
    expect(r.setAsidePerMonth * r.monthsLeft).toBeGreaterThanOrEqual(r.remainingTax);
    expect(r.jarRatePct).toBeGreaterThan(0);
    expect(r.jarRatePct).toBeLessThanOrEqual(60);
    expect(r.nextInstallment).not.toBeNull();
  });

  it("44AD blends 6%/8% by digital share", () => {
    // ₹2.5cr in 10 months → ₹3cr projected (the 44AD ceiling with digital receipts)
    const digital = taxJar({ receiptsToDate: 25_000_000, monthsElapsed: 10, kind: "business", presumptive: true, digitalShare: 1 });
    const cash = taxJar({ receiptsToDate: 25_000_000, monthsElapsed: 10, kind: "business", presumptive: true, digitalShare: 0 });
    expect(digital.projectedTaxableIncome).toBe(Math.round(30_000_000 * 0.06)); // 18L
    expect(cash.projectedTaxableIncome).toBe(Math.round(30_000_000 * 0.08)); // 24L
    expect(cash.projectedTax).toBeGreaterThan(digital.projectedTax);
  });

  it("tax already paid reduces the jar; overpayment → zero set-aside note", () => {
    const r = taxJar({ receiptsToDate: 1_800_000, monthsElapsed: 6, kind: "professional", presumptive: true, taxPaidSoFar: 10_000_000 });
    expect(r.remainingTax).toBe(0);
    expect(r.notes.join(" ")).toMatch(/refund/);
  });
});

describe("notice decoder in glossary", () => {
  it("decodes 143(1), 139(9), 245 and 148", () => {
    expect(glossaryAnswer("what is 143(1)?")!.term).toMatch(/143\(1\)/);
    expect(glossaryAnswer("I got a defective return notice, explain 139(9)")!.term).toMatch(/139\(9\)/);
    expect(glossaryAnswer("explain section 245 refund adjusted")!.term).toMatch(/245/);
    expect(glossaryAnswer("what is a 148 reassessment notice?")!.term).toMatch(/148/);
  });
});
