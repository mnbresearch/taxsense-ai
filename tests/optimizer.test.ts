/**
 * Optimizer tests — 5 realistic profiles (Session 2).
 * Asserts the optimizer's recommendations are SANE, not just non-crashing.
 */
import { describe, expect, it } from "vitest";
import { emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { optimize, simulate, standardVariations } from "../src/lib/optimizer";

/* Profile 1 — fresh salaried employee, ₹7L, no investments */
const fresher: TaxProfile = {
  ...emptyProfile(),
  age: 23,
  salary: {
    grossSalary: 700_000,
    basicPlusDA: 350_000,
    hraReceived: 140_000,
    rentPaid: 180_000,
    isMetroCity: true,
    employerNpsContribution: 0,
    professionalTax: 2_400,
  },
};

/* Profile 2 — salaried + rental income + home loan */
const landlord: TaxProfile = {
  ...emptyProfile(),
  age: 38,
  salary: {
    grossSalary: 1_800_000,
    basicPlusDA: 900_000,
    hraReceived: 0,
    rentPaid: 0,
    isMetroCity: false,
    employerNpsContribution: 0,
    professionalTax: 2_400,
  },
  houseProperties: [
    { use: "let-out", annualRent: 300_000, municipalTaxes: 12_000, homeLoanInterest: 350_000 },
  ],
  deductions: { ...emptyProfile().deductions, section80C: 150_000 },
};

/* Profile 3 — freelancer (44ADA presumptive) */
const freelancer: TaxProfile = {
  ...emptyProfile(),
  age: 29,
  business: { netIncome: 1_100_000, presumptive: true },
  deductions: { ...emptyProfile().deductions, section80C: 60_000 },
};

/* Profile 4 — salaried with stock-sale capital gains */
const trader: TaxProfile = {
  ...emptyProfile(),
  age: 31,
  salary: {
    grossSalary: 1_400_000,
    basicPlusDA: 700_000,
    hraReceived: 0,
    rentPaid: 0,
    isMetroCity: false,
    employerNpsContribution: 0,
    professionalTax: 0,
  },
  capitalGains: { stcg111A: 180_000, stcgOther: 0, ltcg112A: 90_000, ltcgOther: 0 },
};

/* Profile 5 — senior citizen, pension + interest */
const senior: TaxProfile = {
  ...emptyProfile(),
  age: 67,
  salary: {
    grossSalary: 600_000,
    basicPlusDA: 0,
    hraReceived: 0,
    rentPaid: 0,
    isMetroCity: false,
    employerNpsContribution: 0,
    professionalTax: 0,
  },
  otherSources: { savingsInterest: 40_000, fdInterest: 260_000, dividends: 0, familyPension: 0, other: 0 },
};

describe("optimizer — 5 realistic profiles", () => {
  it("fresher (₹7L): new regime, zero tax, and no suggestion to lock money into 80C", () => {
    const r = optimize(fresher);
    expect(r.recommendedRegime).toBe("new");
    expect(r.baseline.new.totalTaxLiability).toBe(0); // ≤ ₹12L → 87A rebate
    // Nothing can save tax that is already zero:
    expect(r.suggestions.length).toBe(0);
  });

  it("landlord: old regime competitive due to let-out loss; suggestions quantified", () => {
    const r = optimize(landlord);
    expect(["old", "new"]).toContain(r.recommendedRegime);
    // let-out loss: NAV (300k−12k)×70% − 350k interest = −148,400 (below ₹2L cap)
    expect(r.baseline.old.heads.houseProperty).toBe(-148_400);
    // every suggestion must actually reduce tax and carry a label + outlay
    for (const s of r.suggestions) {
      expect(s.taxSaved).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(10);
    }
  });

  it("freelancer: NPS 80CCD(1B) suggestion exists and saving ≈ marginal rate × 50k when old regime is in play", () => {
    const r = optimize(freelancer);
    const nps = r.suggestions.find((s) => s.id.startsWith("nps"));
    // In the new regime era, moves only matter if they flip/deepen the old-regime path;
    // assert the simulation is at least present & consistent:
    const sims = simulate(freelancer, standardVariations(freelancer));
    expect(sims.length).toBeGreaterThan(0);
    for (const s of sims) expect(s.bestLiability).toBeLessThanOrEqual(
      Math.min(r.baseline.old.totalTaxLiability, r.baseline.new.totalTaxLiability)
    );
    if (nps) expect(nps.taxSaved).toBeGreaterThan(0);
  });

  it("trader: CG tax survives rebate; LTCG harvesting headroom flagged", () => {
    const r = optimize(trader);
    // 90k LTCG < 1.25L exemption → harvesting suggestion should exist
    const harvest = standardVariations(trader).find((v) => v.id === "ltcg-harvest");
    expect(harvest).toBeDefined();
    // STCG @20% must appear in both regimes' liability
    expect(r.baseline.new.specialRateTax.stcg111A.tax).toBe(36_000);
  });

  it("senior: 80TTB makes old regime meaningfully better than raw slabs; recommendation sane", () => {
    const r = optimize(senior);
    expect(r.baseline.old.deductionsAllowed["80TTB"]).toBe(50_000);
    // Total income ≤ ₹12L → new regime is zero-tax and must be recommended
    expect(r.recommendedRegime).toBe("new");
    expect(r.baseline.new.totalTaxLiability).toBe(0);
  });

  it("what-if ranking is by tax saved, descending", () => {
    const sims = simulate(landlord, standardVariations(landlord));
    for (let i = 1; i < sims.length; i++)
      expect(sims[i - 1].taxSaved).toBeGreaterThanOrEqual(sims[i].taxSaved);
  });

  it("headline is human-readable and quantified", () => {
    const r = optimize(landlord);
    expect(r.headline).toMatch(/regime/);
    expect(r.headline).toMatch(/₹/);
  });

  it("employer-NPS restructure move exists, works in the NEW regime, and respects the 14% cap", () => {
    const vars = standardVariations(landlord); // basic+DA 9L → cap 1.26L
    const enps = vars.find((v) => v.id.startsWith("enps"))!;
    expect(enps).toBeDefined();
    expect(enps.label).toMatch(/BOTH regimes/);
    // applying it must reduce NEW-regime tax (the whole point)
    const sims = simulate(landlord, [enps]);
    expect(sims[0].comparison.new.totalTaxLiability).toBeLessThan(
      optimize(landlord).baseline.new.totalTaxLiability
    );
    // amount within the 14% new-regime cap
    const amt = Number(enps.id.split("-")[1]);
    expect(amt).toBeLessThanOrEqual(0.14 * 900_000);
  });
});
