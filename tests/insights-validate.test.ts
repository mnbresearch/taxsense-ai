/** Insights engine + profile validation tests (feature batch 3). */
import { describe, expect, it } from "vitest";
import { computeBoth, emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { breakEvenInsight, computeInsights, harvestInsight, takeHomeInsight } from "../src/lib/optimizer/insights";
import { parseProfile, safeParseProfile } from "../src/lib/tax-engine/validate";

const salaried = (gross: number, extra: Partial<TaxProfile> = {}): TaxProfile => ({
  ...emptyProfile(),
  salary: {
    grossSalary: gross, basicPlusDA: gross / 2, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  },
  ...extra,
});

describe("break-even insight", () => {
  it("finds the exact flip point and it actually flips", () => {
    const p = salaried(2_500_000);
    const cmp = computeBoth(p);
    const be = breakEvenInsight(p, cmp)!;
    expect(be.extraDeductionNeeded).not.toBeNull();
    const need = be.extraDeductionNeeded!;
    // verify: adding `need` as deduction makes old ≤ new
    const flipped = JSON.parse(JSON.stringify(p)) as TaxProfile;
    flipped.deductions.section80G += need;
    const cmp2 = computeBoth(flipped);
    expect(cmp2.old.totalTaxLiability).toBeLessThanOrEqual(cmp.new.totalTaxLiability);
    // and 10k less does NOT flip
    const under = JSON.parse(JSON.stringify(p)) as TaxProfile;
    under.deductions.section80G += need - 10_000;
    expect(computeBoth(under).old.totalTaxLiability).toBeGreaterThan(cmp.new.totalTaxLiability);
  });

  it("returns null when old regime already wins", () => {
    const p = salaried(1_600_000);
    p.salary!.hraReceived = 320_000; p.salary!.rentPaid = 300_000; p.salary!.isMetroCity = true;
    p.deductions.section80C = 150_000;
    p.houseProperties = [{ use: "self-occupied", annualRent: 0, municipalTaxes: 0, homeLoanInterest: 250_000 }];
    const cmp = computeBoth(p);
    expect(cmp.recommended).toBe("old");
    expect(breakEvenInsight(p, cmp)).toBeNull();
  });

  it("declares 'decisively new' when no deduction can flip (LTCG-only income)", () => {
    // VI-A deductions cannot offset special-rate gains, and the old-regime
    // basic exemption (2.5L) absorbs less than the new (4L) — unflippable.
    const p: TaxProfile = {
      ...emptyProfile(),
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 1_000_000, ltcgOther: 0 },
    };
    const cmp = computeBoth(p);
    expect(cmp.recommended).toBe("new");
    const be = breakEvenInsight(p, cmp)!;
    expect(be.extraDeductionNeeded).toBeNull();
    expect(be.headline).toMatch(/decisively/);
  });
});

describe("harvest + take-home insights", () => {
  it("harvest headroom = 1.25L − realised LTCG", () => {
    const p = salaried(1_500_000, {
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 40_000, ltcgOther: 0 },
    });
    const h = harvestInsight(p)!;
    expect(h.headroom).toBe(85_000);
  });

  it("no harvest card without capital-gains context", () => {
    expect(harvestInsight(salaried(1_500_000))).toBeNull();
  });

  it("take-home divides net of the recommended regime", () => {
    const p = salaried(2_400_000);
    const cmp = computeBoth(p);
    const th = takeHomeInsight(p, cmp)!;
    expect(th.monthlyInHand).toBe(Math.round((2_400_000 - cmp[cmp.recommended].totalTaxLiability) / 12));
  });

  it("computeInsights returns a sane bundle", () => {
    const p = salaried(2_500_000, {
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 },
    });
    const list = computeInsights(p, computeBoth(p));
    expect(list.map((i) => i.kind)).toEqual(["breakEven", "harvest", "takeHome"]);
  });
});

describe("profile validation (robustness)", () => {
  it("coerces garbage fields to safe defaults instead of crashing", () => {
    const p = parseProfile({
      age: "hacker" as any, residentialStatus: "alien",
      salary: { grossSalary: -5, basicPlusDA: "x", hraReceived: 0, rentPaid: 0, isMetroCity: "yes", employerNpsContribution: 0, professionalTax: 0 },
      houseProperties: "not-an-array", deductions: null, taxesPaid: -100,
    });
    expect(p.age).toBe(30);
    expect(p.residentialStatus).toBe("resident");
    expect(p.salary!.grossSalary).toBe(0);
    expect(p.houseProperties).toEqual([]);
    expect(p.taxesPaid).toBe(0);
    // and the engine runs on it
    expect(() => computeBoth(p)).not.toThrow();
  });

  it("rejects non-object payloads cleanly", () => {
    const r = safeParseProfile("just a string");
    expect(r.ok).toBe(false);
  });

  it("caps absurd magnitudes (1e14 rupees) via safe default", () => {
    const r = safeParseProfile({ ...emptyProfile(), taxesPaid: 1e14 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.taxesPaid).toBe(0);
  });

  it("valid profiles pass through unchanged", () => {
    const p = salaried(1_200_000);
    const r = safeParseProfile(p);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.salary!.grossSalary).toBe(1_200_000);
  });
});
