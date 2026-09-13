import { describe, it, expect } from "vitest";
import { computeBoth } from "../src/lib/tax-engine";
import { safeParseProfile } from "../src/lib/tax-engine/validate";
import { recommendItrForm } from "../src/lib/tax-engine/itrForm";
import { buildFilingSheet, renderFilingSheetText } from "../src/lib/itrExport";
import type { TaxProfile } from "../src/lib/tax-engine/types";

function sheetFor(raw: any) {
  const parsed = safeParseProfile(raw);
  if (!parsed.ok) throw new Error("bad profile");
  const profile = parsed.profile;
  const comp = computeBoth(profile);
  const best = comp[comp.recommended];
  const itr = recommendItrForm(profile, best.totalIncome);
  return buildFilingSheet(profile, best, itr);
}

describe("buildFilingSheet", () => {
  const profile: any = {
    age: 30, residentialStatus: "resident",
    salary: { grossSalary: 1850000, professionalTax: 2400 },
    houseProperties: [], deductions: { section80C: 150000 },
  };
  const sheet = sheetFor(profile);

  it("has form + AY + regime metadata", () => {
    expect(sheet.meta.form).toMatch(/ITR/);
    expect(sheet.meta.assessmentYear).toBe("AY 2026-27");
    expect(["old", "new"]).toContain(sheet.meta.regime);
  });
  it("carries the not-a-portal-file disclaimer", () => {
    expect(sheet.meta.disclaimer).toMatch(/not an official ITR upload/i);
  });
  it("lists a salary income line", () => {
    expect(sheet.income.some((l) => /Salary/i.test(l.label))).toBe(true);
  });
  it("includes Gross Total Income and Total Tax Liability", () => {
    expect(sheet.income.some((l) => l.label === "Gross Total Income")).toBe(true);
    expect(sheet.taxComputation.some((l) => l.label === "Total Tax Liability")).toBe(true);
  });
  it("shows a payable-or-refund line", () => {
    expect(sheet.taxesPaidAndDue.some((l) => /PAYABLE|Refund/.test(l.label))).toBe(true);
  });
  it("renders a text worksheet with schedule codes", () => {
    const txt = renderFilingSheetText(sheet);
    expect(txt).toMatch(/ITR FILING SHEET/);
    expect(txt).toMatch(/Schedule S/);
    expect(txt).toMatch(/TAX COMPUTATION/);
  });
});

describe("filing sheet reflects capital gains", () => {
  it("adds a Schedule CG line when LTCG present", () => {
    const p: any = { age: 30, residentialStatus: "resident", capitalGains: { ltcg112A: 500000 }, houseProperties: [], deductions: {} };
    const sheet = sheetFor(p);
    expect(sheet.income.some((l) => /Capital Gains/i.test(l.label))).toBe(true);
  });
});
