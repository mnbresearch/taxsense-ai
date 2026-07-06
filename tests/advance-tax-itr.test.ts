/** Advance-tax schedule + ITR recommender tests (feature batch 2). */
import { describe, expect, it } from "vitest";
import { computeRegime, emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { advanceTaxPlan } from "../src/lib/tax-engine/advanceTax";
import { recommendItrForm } from "../src/lib/tax-engine/itrForm";

const salaried = (gross: number, extra: Partial<TaxProfile> = {}): TaxProfile => ({
  ...emptyProfile(),
  salary: {
    grossSalary: gross, basicPlusDA: gross / 2, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  },
  ...extra,
});

describe("advance tax (ss.207-211, 234B/234C)", () => {
  it("not applicable below ₹10,000 net tax", () => {
    const p = salaried(1_275_000); // zero tax in new regime
    const plan = advanceTaxPlan(p, computeRegime(p, "new"));
    expect(plan.applicable).toBe(false);
    expect(plan.installments.length).toBe(0);
  });

  it("regular schedule: 15/45/75/100 with rounded cumulative amounts", () => {
    const p = salaried(2_500_000); // new regime tax 307,500×1.04 = 319,800
    const plan = advanceTaxPlan(p, computeRegime(p, "new"));
    expect(plan.applicable).toBe(true);
    expect(plan.installments.map((i) => i.cumulativePct)).toEqual([15, 45, 75, 100]);
    expect(plan.installments[3].cumulativeAmount).toBe(319_800);
    // installments sum to the cumulative total
    const sum = plan.installments.reduce((a, i) => a + i.installmentAmount, 0);
    expect(sum).toBe(319_800);
    // 234C worst case: 1%×3mo×(15+45+75)% + 1%×1mo×100% = 3%×135% + 1% = 5.05% of tax
    expect(plan.interest234C_ifAllMissed).toBe(Math.round(319_800 * 0.0505));
    // 234B at 4 months: 4% of net tax
    expect(plan.interest234B_ifUnpaid(4)).toBe(Math.round(319_800 * 0.04));
  });

  it("TDS reduces the base; senior citizen without business is exempt", () => {
    const p = salaried(2_500_000, { taxesPaid: 300_000 });
    const plan = advanceTaxPlan(p, computeRegime(p, "new"));
    expect(plan.netTaxAfterTds).toBe(19_800);

    const senior = salaried(2_500_000, { age: 65 });
    const planSenior = advanceTaxPlan(senior, computeRegime(senior, "new"));
    expect(planSenior.applicable).toBe(false);
    expect(planSenior.reason).toMatch(/senior/i);
  });

  it("presumptive: single March installment", () => {
    const p: TaxProfile = { ...emptyProfile(), business: { netIncome: 2_000_000, presumptive: true } };
    const plan = advanceTaxPlan(p, computeRegime(p, "new"));
    expect(plan.presumptiveSchedule).toBe(true);
    expect(plan.installments.length).toBe(1);
    expect(plan.installments[0].dueDate).toBe("2026-03-15");
  });
});

describe("ITR form recommender", () => {
  it("plain salaried → ITR-1", () => {
    const r = recommendItrForm(salaried(1_200_000), 1_125_000);
    expect(r.form).toBe("ITR-1");
  });

  it("equity LTCG within ₹1.25L stays in ITR-1 (AY 2025-26 change)", () => {
    const p = salaried(1_200_000, {
      capitalGains: { stcg111A: 0, stcgOther: 0, ltcg112A: 100_000, ltcgOther: 0 },
    });
    const r = recommendItrForm(p, 1_225_000);
    expect(r.form).toBe("ITR-1");
    expect(r.reasons.join(" ")).toMatch(/1.25L|1,25/);
  });

  it("STCG forces ITR-2; >50L forces ITR-2; two properties force ITR-2", () => {
    expect(
      recommendItrForm(
        salaried(1_200_000, { capitalGains: { stcg111A: 50_000, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 } }),
        1_175_000
      ).form
    ).toBe("ITR-2");
    expect(recommendItrForm(salaried(6_000_000), 5_925_000).form).toBe("ITR-2");
    const twoHp = salaried(1_200_000, {
      houseProperties: [
        { use: "self-occupied", annualRent: 0, municipalTaxes: 0, homeLoanInterest: 0 },
        { use: "let-out", annualRent: 240_000, municipalTaxes: 0, homeLoanInterest: 0 },
      ],
    });
    expect(recommendItrForm(twoHp, 1_293_000).form).toBe("ITR-2");
  });

  it("presumptive freelancer ≤50L → ITR-4; non-presumptive business → ITR-3", () => {
    const sugam: TaxProfile = { ...emptyProfile(), business: { netIncome: 1_400_000, presumptive: true } };
    expect(recommendItrForm(sugam, 1_400_000).form).toBe("ITR-4");
    const itr3: TaxProfile = { ...emptyProfile(), business: { netIncome: 1_400_000, presumptive: false } };
    expect(recommendItrForm(itr3, 1_400_000).form).toBe("ITR-3");
  });

  it("presumptive but with STCG falls out of Sugam → ITR-3", () => {
    const p: TaxProfile = {
      ...emptyProfile(),
      business: { netIncome: 1_400_000, presumptive: true },
      capitalGains: { stcg111A: 80_000, stcgOther: 0, ltcg112A: 0, ltcgOther: 0 },
    };
    expect(recommendItrForm(p, 1_480_000).form).toBe("ITR-3");
  });
});
