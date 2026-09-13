import { describe, it, expect } from "vitest";
import { computeBoth } from "../src/lib/tax-engine";
import { safeParseProfile } from "../src/lib/tax-engine/validate";
import { recommendItrForm } from "../src/lib/tax-engine/itrForm";
import { buildItr1Json } from "../src/lib/itrJson";

function draftFor(raw: any) {
  const parsed = safeParseProfile(raw);
  if (!parsed.ok) throw new Error("bad profile");
  const profile = parsed.profile;
  const comp = computeBoth(profile);
  const best = comp[comp.recommended];
  const itr = recommendItrForm(profile, best.totalIncome);
  return { d: buildItr1Json(profile, best, itr), best, itr };
}

describe("buildItr1Json — ITR-1 eligible", () => {
  const { d, best } = draftFor({
    age: 30, residentialStatus: "resident",
    salary: { grossSalary: 1850000, professionalTax: 2400 },
    houseProperties: [], deductions: { section80C: 150000 },
  });

  it("is eligible for a simple salaried profile", () => expect(d.eligible).toBe(true));
  it("carries a loud DRAFT status", () => expect(d.status).toMatch(/DRAFT/));
  it("has the ITR1 root structure", () => {
    expect(d.json!.ITR.ITR1.Form_ITR1.FormName).toBe("ITR1");
    expect(d.json!.ITR.ITR1.Form_ITR1.AssessmentYear).toBe("2026");
  });
  it("TotalIncome matches the engine to the rupee", () => {
    expect(d.json!.ITR.ITR1.ITR1_IncomeDeductions.TotalIncome).toBe(Math.round(best.totalIncome));
  });
  it("GrossTaxLiability matches the engine", () => {
    expect(d.json!.ITR.ITR1.ITR1_TaxComputation.GrossTaxLiability).toBe(Math.round(best.totalTaxLiability));
  });
  it("maps 80C into Chapter VI-A when the filed regime allows it (old regime)", () => {
    // The recommended regime here may be NEW (no VI-A). Verify the mapping via
    // the OLD-regime computation, where 80C is actually allowed.
    const parsed = safeParseProfile({
      age: 30, residentialStatus: "resident",
      salary: { grossSalary: 1850000, professionalTax: 2400 },
      houseProperties: [], deductions: { section80C: 150000 },
    });
    if (!parsed.ok) throw new Error("bad");
    const comp = computeBoth(parsed.profile);
    const itr = recommendItrForm(parsed.profile, comp.old.totalIncome);
    const draft = buildItr1Json(parsed.profile, comp.old, itr);
    expect(draft.json!.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C).toBe(150000);
    expect(draft.json!.ITR.ITR1.FilingStatus.NewTaxRegime).toBe("N");
  });
  it("sets the regime flag consistently", () => {
    const flag = d.json!.ITR.ITR1.FilingStatus.NewTaxRegime;
    expect(flag === "Y" || flag === "N").toBe(true);
    expect(flag).toBe(best.regime === "new" ? "Y" : "N");
  });
  it("balance payable / refund never both positive", () => {
    const bal = d.json!.ITR.ITR1.TaxPaid.BalTaxPayable;
    const ref = d.json!.ITR.ITR1.Refund.RefundDue;
    expect(bal === 0 || ref === 0).toBe(true);
  });
});

describe("buildItr1Json — scope guard", () => {
  it("refuses a 44ADA presumptive profile (ITR-4), no wrong-shaped file", () => {
    const { d, itr } = draftFor({
      age: 30, residentialStatus: "resident",
      business: { netIncome: 1500000, presumptive: true },
      houseProperties: [], deductions: {},
    });
    expect(itr.form).toBe("ITR-4");
    expect(d.eligible).toBe(false);
    expect(d.reason).toMatch(/ITR-4/);
    expect(d.json).toBeUndefined();
  });
});
