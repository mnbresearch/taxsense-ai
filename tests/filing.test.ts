/** Batch 76 — Filing Kit: documents, scrutiny radar, walkthrough. */
import { describe, expect, it } from "vitest";
import { computeBoth, emptyProfile } from "../src/lib/tax-engine";
import type { TaxProfile } from "../src/lib/tax-engine";
import { recommendItrForm } from "../src/lib/tax-engine/itrForm";
import { buildFilingKit } from "../src/lib/filing";

const BEFORE_DUE = new Date("2026-07-01T12:00:00+05:30");
const AFTER_DUE = new Date("2026-08-12T12:00:00+05:30");

function kit(p: TaxProfile, today = BEFORE_DUE) {
  const cmp = computeBoth(p);
  const itr = recommendItrForm(p, cmp[cmp.recommended].totalIncome);
  return { cmp, itr, kit: buildFilingKit(p, cmp, itr, today) };
}

const salaried = (gross: number, extra: Partial<TaxProfile> = {}): TaxProfile => ({
  ...emptyProfile(),
  salary: {
    grossSalary: gross, basicPlusDA: gross / 2, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  },
  taxesPaid: 0,
  ...extra,
});

describe("filing kit — documents", () => {
  it("always includes identity + AIS/26AS basics", () => {
    const { kit: k } = kit(salaried(1_000_000));
    expect(k.documents[0].items.map((i) => i.label).join(" ")).toMatch(/26AS/);
    expect(k.documents[0].items.map((i) => i.label).join(" ")).toMatch(/AIS/);
  });

  it("asks for landlord PAN only above ₹1L rent", () => {
    const low = kit(salaried(1_200_000, { salary: { grossSalary: 1_200_000, basicPlusDA: 600_000, hraReceived: 200_000, rentPaid: 96_000, isMetroCity: true, employerNpsContribution: 0, professionalTax: 0 } }));
    const high = kit(salaried(1_200_000, { salary: { grossSalary: 1_200_000, basicPlusDA: 600_000, hraReceived: 200_000, rentPaid: 240_000, isMetroCity: true, employerNpsContribution: 0, professionalTax: 0 } }));
    const flat = (x: typeof low) => x.kit.documents.flatMap((g) => g.items.map((i) => i.label)).join(" | ");
    expect(flat(low)).not.toMatch(/Landlord/);
    expect(flat(high)).toMatch(/Landlord's PAN/);
    expect(high.kit.redFlags.some((f) => f.title.includes("landlord PAN"))).toBe(true);
  });

  it("presumptive business asks for receipts, not books", () => {
    const { kit: k } = kit(salaried(0, { business: { netIncome: 900_000, presumptive: true } }));
    const biz = k.documents.find((g) => g.group.includes("Business"))!;
    expect(biz.items.map((i) => i.label).join(" ")).toMatch(/receipts/i);
    expect(biz.items.map((i) => i.label).join(" ")).not.toMatch(/Books of account/);
  });
});

describe("filing kit — scrutiny radar", () => {
  it("flags belated filing only after 31 July", () => {
    const before = kit(salaried(2_000_000), BEFORE_DUE);
    const after = kit(salaried(2_000_000), AFTER_DUE);
    expect(before.kit.redFlags.some((f) => f.title.includes("belated"))).toBe(false);
    expect(after.kit.redFlags.some((f) => f.title.includes("belated"))).toBe(true);
  });

  it("belated fee is ₹1,000 for small incomes", () => {
    const { kit: k } = kit(salaried(450_000), AFTER_DUE);
    const flag = k.redFlags.find((f) => f.title.includes("belated"))!;
    expect(flag.detail).toMatch(/₹1,000/);
  });

  it("flags zero taxes paid against a real liability", () => {
    const { kit: k } = kit(salaried(2_500_000));
    expect(k.redFlags.some((f) => f.title.includes("zero tax paid"))).toBe(true);
  });

  it("flags missing interest income (AIS mismatch)", () => {
    const none = kit(salaried(1_500_000));
    const some = kit(salaried(1_500_000, { otherSources: { savingsInterest: 8_000, fdInterest: 0, dividends: 0, familyPension: 0, other: 0 } }));
    expect(none.kit.redFlags.some((f) => f.title.includes("interest"))).toBe(true);
    expect(some.kit.redFlags.some((f) => f.title.includes("No interest"))).toBe(false);
  });

  it("large refunds get the TDS-reconciliation flag", () => {
    const { kit: k } = kit(salaried(1_500_000, { taxesPaid: 300_000 }));
    expect(k.redFlags.some((f) => f.title.includes("refund"))).toBe(true);
  });
});

describe("filing kit — walkthrough", () => {
  it("names the recommended ITR form and e-verification", () => {
    const { kit: k, itr } = kit(salaried(1_000_000));
    expect(k.steps.some((s) => s.title.includes(itr.form))).toBe(true);
    expect(k.steps.some((s) => s.title.includes("e-verify"))).toBe(true);
  });

  it("adds the 10-IEA step only for business + old regime", () => {
    const bizOld = kit(salaried(0, {
      business: { netIncome: 2_000_000, presumptive: true },
      deductions: { ...emptyProfile().deductions, section80C: 150_000, section80D_selfFamily: 25_000 },
      houseProperties: [{ use: "self-occupied", annualRent: 0, municipalTaxes: 0, homeLoanInterest: 200_000 }],
    }));
    const steps = bizOld.kit.steps.map((s) => s.title).join(" | ");
    if (bizOld.cmp.recommended === "old") expect(steps).toMatch(/10-IEA/);
    const salariedNew = kit(salaried(1_500_000));
    expect(salariedNew.kit.steps.map((s) => s.title).join(" | ")).not.toMatch(/10-IEA/);
  });

  it("adds a pay-first step when balance is payable", () => {
    const { kit: k } = kit(salaried(2_500_000));
    expect(k.steps.some((s) => s.title.startsWith("Pay the balance"))).toBe(true);
  });
});
