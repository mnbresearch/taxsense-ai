/** Batches 88-90 — property CG, residency, gifts, advance tax. */
import { describe, expect, it } from "vitest";
import { propertySale } from "../src/lib/cgProperty";
import { giftTaxability, residentialStatus } from "../src/lib/residency";
import { advanceSchedule } from "../src/lib/advtax";

describe("property capital gains", () => {
  it("grandfathered indexed 20% wins for old, highly-appreciated-by-CII buys", () => {
    // Bought 2005-06 for 20L, sold 1.0cr: no-index gain 80L → 10L tax @12.5%;
    // indexed cost 20L×376/117 = 64.27L → gain 35.7L → 7.15L @20% (lower).
    const r = propertySale({ salePrice: 10_000_000, purchaseCost: 2_000_000, purchaseFY: "2005-06", acquiredBeforeJul2024: true, longTerm: true, asset: "residential-house", reinvestHouse: 0, reinvestBonds: 0, ownsMoreThanOneHouse: false });
    expect(r.chosen).toContain("20%");
    expect(r.taxIndexed!).toBeLessThan(r.taxNoIndex);
  });
  it("post-Jul-2024 acquisition: only 12.5% applies", () => {
    const r = propertySale({ salePrice: 8_000_000, purchaseCost: 6_000_000, purchaseFY: "2024-25", acquiredBeforeJul2024: false, longTerm: true, asset: "other-property", reinvestHouse: 0, reinvestBonds: 0, ownsMoreThanOneHouse: false });
    expect(r.gainIndexed).toBeNull();
    expect(r.finalTax).toBe(Math.round(2_000_000 * 0.125));
  });
  it("s.54: full reinvestment of gain → zero tax", () => {
    const r = propertySale({ salePrice: 10_000_000, purchaseCost: 2_000_000, purchaseFY: "2005-06", acquiredBeforeJul2024: true, longTerm: true, asset: "residential-house", reinvestHouse: 9_000_000, reinvestBonds: 0, ownsMoreThanOneHouse: false });
    expect(r.finalTax).toBe(0);
  });
  it("s.54F is proportionate to consideration invested", () => {
    const r = propertySale({ salePrice: 10_000_000, purchaseCost: 5_000_000, purchaseFY: "2024-25", acquiredBeforeJul2024: false, longTerm: true, asset: "other-property", reinvestHouse: 5_000_000, reinvestBonds: 0, ownsMoreThanOneHouse: false });
    expect(r.exemption54).toBe(2_500_000); // gain 50L × (50L/1cr)
  });
  it("54EC caps at ₹50L", () => {
    const r = propertySale({ salePrice: 30_000_000, purchaseCost: 10_000_000, purchaseFY: "2024-25", acquiredBeforeJul2024: false, longTerm: true, asset: "other-property", reinvestHouse: 0, reinvestBonds: 9_000_000, ownsMoreThanOneHouse: false });
    expect(r.exemption54EC).toBe(5_000_000);
  });
  it("short-term: slab, no exemptions", () => {
    const r = propertySale({ salePrice: 6_000_000, purchaseCost: 5_000_000, purchaseFY: "2024-25", acquiredBeforeJul2024: false, longTerm: false, asset: "residential-house", reinvestHouse: 5_000_000, reinvestBonds: 0, ownsMoreThanOneHouse: false });
    expect(r.taxableGainAfterExemptions).toBe(1_000_000);
    expect(r.exemption54).toBe(0);
  });
});

describe("residential status s.6", () => {
  const base = { days4PrecedingYears: 0, citizenOrPIO: true, visitingIndia: false, leftForEmployment: false, indianIncomeOver15L: false, notTaxedAnywhere: false, residentIn2of10: true, days730In7: true };
  it("200 days + history → ROR", () => {
    expect(residentialStatus({ ...base, daysThisYear: 200 }).status).toBe("ROR");
  });
  it("90 days, no 4-year presence → NR", () => {
    expect(residentialStatus({ ...base, daysThisYear: 90 }).status).toBe("NR");
  });
  it("visiting PIO 130 days with >15L Indian income → RNOR (120-day rule)", () => {
    expect(residentialStatus({ ...base, daysThisYear: 130, days4PrecedingYears: 400, visitingIndia: true, indianIncomeOver15L: true }).status).toBe("RNOR");
  });
  it("deemed resident 6(1A) → RNOR", () => {
    expect(residentialStatus({ ...base, daysThisYear: 10, indianIncomeOver15L: true, notTaxedAnywhere: true }).status).toBe("RNOR");
  });
  it("left for employment: 100 days is NOT resident (182 relaxation)", () => {
    expect(residentialStatus({ ...base, daysThisYear: 100, days4PrecedingYears: 1200, leftForEmployment: true }).status).toBe("NR");
  });
});

describe("gifts 56(2)(x)", () => {
  it("₹60k from a friend → whole amount taxable", () => {
    expect(giftTaxability({ kind: "money", value: 60_000, fromRelative: false, onMarriage: false, byWillOrInheritance: false }).taxable).toBe(60_000);
  });
  it("₹40k from a friend → not taxable", () => {
    expect(giftTaxability({ kind: "money", value: 40_000, fromRelative: false, onMarriage: false, byWillOrInheritance: false }).taxable).toBe(0);
  });
  it("₹10L from father → exempt", () => {
    expect(giftTaxability({ kind: "money", value: 1_000_000, fromRelative: true, onMarriage: false, byWillOrInheritance: false }).taxable).toBe(0);
  });
});

describe("advance tax schedule", () => {
  it("regular: 15/45/75/100 cumulative", () => {
    const r = advanceSchedule(100_000, false);
    expect(r.rows.map((x) => x.cumulative)).toEqual([15_000, 45_000, 75_000, 100_000]);
  });
  it("presumptive: one shot on 15 March", () => {
    const r = advanceSchedule(200_000, true);
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].cumulative).toBe(200_000);
  });
  it("below ₹10k → not applicable", () => {
    expect(advanceSchedule(9_000, false).applicable).toBe(false);
  });
});
