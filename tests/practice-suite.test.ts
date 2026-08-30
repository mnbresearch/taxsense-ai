/** Batches 85-87 — GST / TDS / audit & entity engines. */
import { describe, expect, it } from "vitest";
import { compositionCheck, gstInterest, gstRegistration, gstrLateFee } from "../src/lib/gst";
import { tdsInterest, tdsLateFee, TDS_SECTIONS } from "../src/lib/tdsRates";
import { auditApplicability, companyTax, firmTax, partnerRemuneration } from "../src/lib/audit44ab";

describe("GST registration", () => {
  it("goods ₹35L in Maharashtra — below ₹40L, optional", () => {
    const r = gstRegistration({ turnover: 3_500_000, supplies: "goods", state: "Maharashtra", interState: false, ecommerce: false });
    expect(r.required).toBe(false);
    expect(r.threshold).toBe(4_000_000);
  });
  it("services ₹25L — above ₹20L, required", () => {
    expect(gstRegistration({ turnover: 2_500_000, supplies: "services", state: "Karnataka", interState: false, ecommerce: false }).required).toBe(true);
  });
  it("inter-state goods → required from ₹0", () => {
    expect(gstRegistration({ turnover: 100_000, supplies: "goods", state: "Delhi", interState: true, ecommerce: false }).required).toBe(true);
  });
  it("Manipur services threshold is ₹10L", () => {
    expect(gstRegistration({ turnover: 1_200_000, supplies: "services", state: "Manipur", interState: false, ecommerce: false }).threshold).toBe(1_000_000);
  });
});

describe("GST composition + fees", () => {
  it("trader ₹80L → 1% = ₹80,000", () => {
    const r = compositionCheck({ turnover: 8_000_000, kind: "manufacturer-trader", state: "Gujarat", interState: false, ecommerce: false });
    expect(r.eligible).toBe(true);
    expect(r.annualTax).toBe(80_000);
  });
  it("services above ₹50L → ineligible", () => {
    expect(compositionCheck({ turnover: 6_000_000, kind: "services", state: "Gujarat", interState: false, ecommerce: false }).eligible).toBe(false);
  });
  it("late fee caps at ₹2,000 for small taxpayers", () => {
    expect(gstrLateFee({ daysLate: 100, nilReturn: false, turnover: 10_000_000 }).fee).toBe(2_000);
  });
  it("nil return: ₹20/day capped ₹500", () => {
    expect(gstrLateFee({ daysLate: 10, nilReturn: true, turnover: 10_000_000 }).fee).toBe(200);
  });
  it("s.50 interest: ₹1L cash tax, 73 days → ₹3,600", () => {
    expect(gstInterest({ taxCash: 100_000, daysLate: 73 }).interest).toBe(3_600);
  });
});

describe("TDS", () => {
  it("catalog covers the new 194T (partner payments)", () => {
    expect(TDS_SECTIONS.some((s) => s.section === "194T")).toBe(true);
  });
  it("201(1A): ₹50k TDS, 3 months late deduction + 2 months late deposit", () => {
    const r = tdsInterest({ tds: 50_000, monthsNotDeducted: 3, monthsNotDeposited: 2 });
    expect(r.leg1).toBe(1_500);
    expect(r.leg2).toBe(1_500);
    expect(r.total).toBe(3_000);
  });
  it("234E fee caps at the TDS amount", () => {
    expect(tdsLateFee({ tds: 5_000, daysLate: 100 }).fee).toBe(5_000);
  });
});

describe("44AB audit applicability", () => {
  it("₹1.5cr business, cash-heavy → audit", () => {
    expect(auditApplicability({ kind: "business", turnover: 15_000_000, cashWithin5pct: false, presumptive: false, belowPresumptiveFloor: false, incomeAboveExemption: true, optedOut44ADRecently: false }).required).toBe(true);
  });
  it("₹8cr digital business → NO audit (₹10cr limit)", () => {
    expect(auditApplicability({ kind: "business", turnover: 80_000_000, cashWithin5pct: true, presumptive: false, belowPresumptiveFloor: false, incomeAboveExemption: true, optedOut44ADRecently: false }).required).toBe(false);
  });
  it("44AD declaring below 6% with taxable income → audit trap", () => {
    expect(auditApplicability({ kind: "business", turnover: 9_000_000, cashWithin5pct: true, presumptive: true, belowPresumptiveFloor: true, incomeAboveExemption: true, optedOut44ADRecently: false }).required).toBe(true);
  });
  it("professional ₹60L, digital, on 44ADA at 50% → no audit (₹75L window)", () => {
    expect(auditApplicability({ kind: "profession", turnover: 6_000_000, cashWithin5pct: true, presumptive: true, belowPresumptiveFloor: false, incomeAboveExemption: true, optedOut44ADRecently: false }).required).toBe(false);
  });
});

describe("partnership + company", () => {
  it("40(b) on ₹10L book profit: 5.4L + 2.4L = ₹7.8L", () => {
    expect(partnerRemuneration(1_000_000).limit).toBe(780_000);
  });
  it("40(b) floor: tiny profit still allows ₹3L", () => {
    expect(partnerRemuneration(100_000).limit).toBe(300_000);
  });
  it("firm tax 30% + cess (no surcharge under ₹1cr)", () => {
    const r = firmTax(2_000_000);
    expect(r.total).toBe(624_000);
  });
  it("company: 115BAA effective 25.17%", () => {
    const r = companyTax({ income: 10_000_000, turnoverUnder400cr: true, newManufacturing: false });
    const baa = r.options.find((o) => o.regime.includes("115BAA"))!;
    expect(baa.effectivePct).toBeCloseTo(25.17, 1);
  });
  it("new manufacturing co: 115BAB wins", () => {
    expect(companyTax({ income: 10_000_000, turnoverUnder400cr: true, newManufacturing: true }).best).toContain("115BAB");
  });
});
