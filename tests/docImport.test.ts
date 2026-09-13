import { describe, it, expect } from "vitest";
import { parseAmount, parseForm16, parseAIS, importDocument, fieldsToPartialProfile } from "../src/lib/intake/docImport";

describe("parseAmount", () => {
  it("handles Indian grouping, rupee sign, decimals, junk", () => {
    expect(parseAmount("12,34,567")).toBe(1234567);
    expect(parseAmount("Rs 45,000.00")).toBe(45000);
    expect(parseAmount("₹ 1,50,000")).toBe(150000);
    expect(parseAmount("nil")).toBe(null);
    expect(parseAmount("")).toBe(null);
  });
});

const FORM16 = `
FORM NO. 16 - PART B
Certificate under section 203 of the Income-tax Act
1. Gross Salary
   (a) Salary as per provisions contained in section 17(1)      Rs. 18,50,000
   Less: Allowances exempt under section 10
   House Rent Allowance under section 10(13A)                    Rs. 1,20,000
2. Less: Deductions under section 16
   (iii) Tax on employment / Professional tax                    Rs. 2,400
Chapter VI-A Deductions
   Deduction under section 80C (80CCE limit)                     Rs. 1,50,000
   Deduction under section 80CCD (1B)                            Rs. 50,000
   Deduction under section 80D                                   Rs. 25,000
Total tax deducted at source                                     Rs. 2,10,000
`;

describe("parseForm16", () => {
  const r = parseForm16(FORM16);
  const byPath = Object.fromEntries(r.fields.map((f) => [f.path, f.value]));
  it("is recognised", () => expect(r.recognised).toBe(true));
  it("gross salary 17(1)", () => expect(byPath["salary.grossSalary"]).toBe(1850000));
  it("HRA 10(13A)", () => expect(byPath["salary.hraReceived"]).toBe(120000));
  it("professional tax", () => expect(byPath["salary.professionalTax"]).toBe(2400));
  it("80C", () => expect(byPath["deductions.section80C"]).toBe(150000));
  it("80CCD(1B)", () => expect(byPath["deductions.section80CCD1B"]).toBe(50000));
  it("80D", () => expect(byPath["deductions.section80D_selfFamily"]).toBe(25000));
  it("TDS surfaced as a note", () => expect(r.notes.join(" ")).toMatch(/2,10,000/));
  it("every field carries evidence", () => expect(r.fields.every((f) => f.evidence.length > 0)).toBe(true));
});

const AIS = `
Annual Information Statement (AIS)
Salary (reported)                                    18,50,000
Interest from savings bank                              12,500
Interest from term deposit                              88,000
Dividend                                               34,000
Long-term capital gain on equity                     2,10,000
Total tax deducted                                   2,10,000
`;

describe("parseAIS", () => {
  const r = parseAIS(AIS);
  const byPath = Object.fromEntries(r.fields.map((f) => [f.path, f.value]));
  it("is recognised", () => expect(r.recognised).toBe(true));
  it("salary", () => expect(byPath["salary.grossSalary"]).toBe(1850000));
  it("savings interest", () => expect(byPath["otherSources.savingsInterest"]).toBe(12500));
  it("fd interest", () => expect(byPath["otherSources.fdInterest"]).toBe(88000));
  it("dividend", () => expect(byPath["otherSources.dividends"]).toBe(34000));
  it("ltcg", () => expect(byPath["capitalGains.ltcg112A"]).toBe(210000));
  it("tds note", () => expect(r.notes.join(" ")).toMatch(/reconcile/));
});

describe("importDocument auto-detect", () => {
  it("routes AIS text to the AIS parser", () => expect(importDocument(AIS).kind).toBe("ais"));
  it("routes Form 16 text to the form16 parser", () => expect(importDocument(FORM16).kind).toBe("form16"));
  it("empty input is not recognised", () => expect(importDocument("").recognised).toBe(false));
});

describe("fieldsToPartialProfile", () => {
  it("nests dot-paths into a profile shape", () => {
    const p = fieldsToPartialProfile([
      { path: "salary.grossSalary", label: "", value: 1850000, evidence: "" },
      { path: "deductions.section80C", label: "", value: 150000, evidence: "" },
    ]);
    expect(p.salary.grossSalary).toBe(1850000);
    expect(p.deductions.section80C).toBe(150000);
  });
});
