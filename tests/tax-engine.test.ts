/**
 * Rules-engine tests — FY 2025-26 (AY 2026-27).
 * Expected values are HAND-COMPUTED from the statutory slabs/caps in
 * constants.ts (verified against incometax.gov.in & ClearTax on 2026-07-06).
 */
import { describe, expect, it } from "vitest";
import { computeBoth, computeRegime, emptyProfile, hraExemption } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";

function salaried(gross: number, overrides: Partial<TaxProfile> = {}): TaxProfile {
  return {
    ...emptyProfile(),
    salary: {
      grossSalary: gross,
      basicPlusDA: gross * 0.5,
      hraReceived: 0,
      rentPaid: 0,
      isMetroCity: false,
      employerNpsContribution: 0,
      professionalTax: 0,
    },
    ...overrides,
  };
}

describe("new regime — salaried basics", () => {
  it("₹12.75L gross salary → zero tax (₹75k std deduction + ₹60k 87A rebate)", () => {
    const r = computeRegime(salaried(1_275_000), "new");
    expect(r.totalIncome).toBe(1_200_000);
    expect(r.taxOnNormalIncome).toBe(60_000); // 4-8L@5% + 8-12L@10%
    expect(r.rebate87A).toBe(60_000);
    expect(r.totalTaxLiability).toBe(0);
  });

  it("s.87A marginal relief just above ₹12L: TI ₹12.1L → pay ₹10,000 + cess", () => {
    const r = computeRegime(salaried(1_285_000), "new");
    expect(r.totalIncome).toBe(1_210_000);
    // slab tax 61,500; relief caps payable slab tax at TI−12L = 10,000
    expect(r.taxOnNormalIncome).toBe(61_500);
    expect(r.rebateMarginalRelief).toBe(51_500);
    expect(r.totalTaxLiability).toBe(10_400); // 10,000 × 1.04
  });

  it("₹25L gross → slab math across every band", () => {
    const r = computeRegime(salaried(2_500_000), "new");
    expect(r.totalIncome).toBe(2_425_000);
    // 20k + 40k + 60k + 80k + 100k + 25k×30% = 307,500
    expect(r.taxOnNormalIncome).toBe(307_500);
    expect(r.totalTaxLiability).toBe(Math.round(307_500 * 1.04));
  });
});

describe("old regime — salaried basics", () => {
  it("₹12.75L gross, no deductions", () => {
    const r = computeRegime(salaried(1_275_000), "old");
    expect(r.totalIncome).toBe(1_225_000); // −50k std deduction
    // 12,500 + 100,000 + 30%×225,000 = 180,000 → +4% cess
    expect(r.totalTaxLiability).toBe(187_200);
  });

  it("87A old: TI ≤ ₹5L → zero tax", () => {
    const p = salaried(540_000);
    p.deductions.section80C = 100_000; // hits cap logic too: TI = 540k−50k−100k = 390k... wait ≤5L anyway
    const r = computeRegime(p, "old");
    expect(r.totalIncome).toBeLessThanOrEqual(500_000);
    expect(r.totalTaxLiability).toBe(0);
  });
});

describe("HRA + home loan (the classic old-regime case)", () => {
  const p: TaxProfile = {
    ...emptyProfile(),
    salary: {
      grossSalary: 1_600_000,
      basicPlusDA: 800_000,
      hraReceived: 320_000,
      rentPaid: 300_000,
      isMetroCity: true,
      employerNpsContribution: 0,
      professionalTax: 0,
    },
    houseProperties: [
      { use: "self-occupied", annualRent: 0, municipalTaxes: 0, homeLoanInterest: 250_000 },
    ],
    deductions: { ...emptyProfile().deductions, section80C: 150_000 },
  };

  it("HRA exemption = min(received, rent−10% basic, 50% basic)", () => {
    expect(hraExemption(p.salary!)).toBe(220_000); // 300k − 80k
  });

  it("old regime: SOP interest capped at ₹2L, 80C applied", () => {
    const r = computeRegime(p, "old");
    expect(r.heads.houseProperty).toBe(-200_000); // capped from 250k
    expect(r.totalIncome).toBe(980_000); // 1330k − 200k − 150k
    expect(r.totalTaxLiability).toBe(112_840); // (12.5k + 96k) × 1.04
  });

  it("new regime ignores HRA & SOP interest; old regime wins here", () => {
    const cmp = computeBoth(p);
    expect(cmp.new.heads.houseProperty).toBe(0);
    expect(cmp.new.totalTaxLiability).toBe(113_100); // 108,750 × 1.04
    expect(cmp.recommended).toBe("old");
    expect(cmp.savings).toBe(260);
  });
});

describe("capital gains only", () => {
  it("₹10L equity LTCG, nothing else — basic exemption absorbs part (new regime)", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 1_000_000, ltcgOther: 0 },
    };
    const r = computeRegime(p, "new");
    expect(r.totalIncome).toBe(1_000_000);
    expect(r.normalIncome).toBe(0);
    // taxable LTCG = 1,000,000 − 125,000 − 400,000 (unused basic exemption) = 475,000
    expect(r.basicExemptionAdjustment).toBe(400_000);
    expect(r.specialRateTax.ltcg112A.taxable).toBe(475_000);
    expect(r.totalTaxLiability).toBe(Math.round(475_000 * 0.125 * 1.04)); // 61,750
  });

  it("87A rebate does NOT wipe out special-rate CG tax (new regime, TI ≤ 12L)", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      capitalGains: { stcg111A: 500_000, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 },
    };
    const r = computeRegime(p, "new");
    // shortfall 4L absorbs 4L of STCG → 1L @ 20% = 20,000 (+cess), no rebate against it
    expect(r.specialRateTax.stcg111A.taxable).toBe(100_000);
    expect(r.rebate87A).toBe(0);
    expect(r.totalTaxLiability).toBe(20_800);
  });

  it("VI-A deductions cannot offset special-rate gains", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      capitalGains: { stcg111A: 800_000, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 },
      deductions: { ...emptyProfile().deductions, section80C: 150_000 },
    };
    const r = computeRegime(p, "old");
    expect(r.totalDeductions).toBe(0); // no normal income to absorb them
    expect(r.totalIncome).toBe(800_000);
  });
});

describe("surcharge", () => {
  it("10% surcharge above ₹50L (new regime)", () => {
    const r = computeRegime(salaried(6_075_000), "new");
    expect(r.totalIncome).toBe(6_000_000);
    expect(r.taxOnNormalIncome).toBe(1_380_000);
    expect(r.surcharge).toBe(138_000);
    expect(r.surchargeMarginalRelief).toBe(0);
    expect(r.totalTaxLiability).toBe(Math.round(1_518_000 * 1.04)); // 15,78,720
  });

  it("marginal relief just above ₹50L", () => {
    const r = computeRegime(salaried(5_085_000), "new"); // TI = 50,10,000
    expect(r.totalIncome).toBe(5_010_000);
    // tax@50.1L = 10,83,000; surcharge 1,08,300 → 11,91,300
    // cap = tax@50L (10,80,000) + excess (10,000) = 10,90,000 → relief 1,01,300
    expect(r.surchargeMarginalRelief).toBe(101_300);
    expect(r.totalTaxLiability).toBe(Math.round(1_090_000 * 1.04));
  });

  it("old regime 37% band exists; new regime caps at 25%", () => {
    const rOld = computeRegime(salaried(60_000_000), "old");
    const rNew = computeRegime(salaried(60_000_000), "new");
    expect(rOld.surcharge / (rOld.taxBeforeRebate - rOld.rebate87A)).toBeCloseTo(0.37, 2);
    expect(rNew.surcharge / (rNew.taxBeforeRebate - rNew.rebate87A)).toBeCloseTo(0.25, 2);
  });

  it("surcharge on CG tax capped at 15% even in 25% band", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      salary: {
        grossSalary: 25_075_000,
        basicPlusDA: 12_000_000,
        hraReceived: 0,
        rentPaid: 0,
        isMetroCity: false,
        employerNpsContribution: 0,
        professionalTax: 0,
      },
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 2_125_000, ltcgOther: 0 },
    };
    const r = computeRegime(p, "new");
    const cgTax = r.specialRateTax.ltcg112A.tax; // 2,00,000 × 12.5% = 2,50,000
    expect(cgTax).toBe(250_000);
    const normalTax = r.taxOnNormalIncome;
    expect(r.surcharge).toBeCloseTo(normalTax * 0.25 + cgTax * 0.15, 0);
  });
});

describe("senior citizens (old regime)", () => {
  it("basic exemption ₹3L at 60+, 80TTB up to ₹50k on all interest", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      age: 65,
      otherSources: {
        savingsInterest: 20_000,
        fdInterest: 60_000,
        dividends: 0,
        familyPension: 0,
        other: 0,
      },
      salary: {
        grossSalary: 800_000, // pension
        basicPlusDA: 0,
        hraReceived: 0,
        rentPaid: 0,
        isMetroCity: false,
        employerNpsContribution: 0,
        professionalTax: 0,
      },
    };
    const r = computeRegime(p, "old");
    expect(r.deductionsAllowed["80TTB"]).toBe(50_000);
    // TI = 800k−50k +80k −50k = 780,000 → tax 10,000 + 56,000 = 66,000... check:
    // slabs 65y: 0-3L nil, 3-5L 5% = 10,000; 5-7.8L 20% = 56,000 → 66,000 ×1.04
    expect(r.totalIncome).toBe(780_000);
    expect(r.totalTaxLiability).toBe(68_640);
  });

  it("super senior (80+): ₹5L basic exemption", () => {
    const p = salaried(550_000, { age: 82 });
    const r = computeRegime(p, "old");
    expect(r.totalIncome).toBe(500_000);
    expect(r.totalTaxLiability).toBe(0);
  });
});

describe("rental income + let-out property", () => {
  it("30% standard deduction on NAV, full interest, loss cap ₹2L (old)", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      salary: salaried(1_500_000).salary,
      houseProperties: [
        { use: "let-out", annualRent: 360_000, municipalTaxes: 10_000, homeLoanInterest: 600_000 },
      ],
    };
    const rOld = computeRegime(p, "old");
    // NAV 350k − 105k − 600k = −355k → capped at −200k
    expect(rOld.heads.houseProperty).toBe(-200_000);
    const rNew = computeRegime(p, "new");
    expect(rNew.heads.houseProperty).toBe(0); // no inter-head set-off in new regime
  });
});

describe("regime comparison sanity", () => {
  it("heavy deduction user → old regime; light user → new regime", () => {
    const heavy = salaried(2_000_000);
    heavy.salary!.hraReceived = 400_000;
    heavy.salary!.rentPaid = 480_000;
    heavy.salary!.isMetroCity = true;
    heavy.deductions.section80C = 150_000;
    heavy.deductions.section80CCD1B = 50_000;
    heavy.deductions.section80D_selfFamily = 25_000;
    heavy.houseProperties = [
      { use: "self-occupied", annualRent: 0, municipalTaxes: 0, homeLoanInterest: 200_000 },
    ];
    expect(computeBoth(heavy).recommended).toBe("old");

    const light = salaried(2_000_000);
    expect(computeBoth(light).recommended).toBe("new");
  });
});
