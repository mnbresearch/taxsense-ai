/** Batch 83 — the last-resort extractor must be genuinely good. */
import { describe, expect, it } from "vitest";
import { mockExtract } from "../src/lib/intake/provider";

const x = (m: string) => JSON.parse(mockExtract(m));

describe("deterministic fallback extractor", () => {
  it("parses the full production-failure message correctly", () => {
    const r = x("I earn 22 LPA, pay 35k rent in Bangalore, put 1.5 lakh in PPF, sold shares held 3 years for 2L profit, and got around 40k FD interest");
    expect(r.updates.salary.grossSalary).toBe(2_200_000);
    expect(r.updates.salary.rentPaid).toBe(420_000); // 35k monthly ×12
    expect(r.updates.salary.isMetroCity).toBe(false); // Bangalore ≠ HRA metro
    expect(r.updates.deductions.section80C).toBe(150_000);
    expect(r.updates.capitalGains.ltcg112A).toBe(200_000); // held 3 years
    expect(r.updates.otherSources.fdInterest).toBe(40_000);
  });

  it("salary phrasings: keyword before and after, monthly annualised", () => {
    expect(x("my salary is 18 lakh per year").updates.salary.grossSalary).toBe(1_800_000);
    expect(x("I have a 12 lpa package").updates.salary.grossSalary).toBe(1_200_000);
    expect(x("earning 80k per month").updates.salary.grossSalary).toBe(960_000);
  });

  it("rent: monthly default, metro detection only for the four HRA metros", () => {
    const r = x("rent 25k in Mumbai");
    expect(r.updates.salary.rentPaid).toBe(300_000);
    expect(r.updates.salary.isMetroCity).toBe(true);
  });

  it("never mistakes holding period for a deduction", () => {
    const r = x("PPF, sold shares held 3 years for 2L profit");
    expect(r.updates.deductions?.section80C).toBeUndefined(); // ₹3 must not appear
  });

  it("short-term when held under a year", () => {
    const r = x("sold stocks held 6 months for 1 lakh profit");
    expect(r.updates.capitalGains.stcg111A).toBe(100_000);
  });

  it("denials land in notApplicable", () => {
    const r = x("I don't own a house and no other income");
    expect(r.notApplicable).toContain("houseProperty");
    expect(r.notApplicable).toContain("otherSources");
  });

  it("home loan interest and TDS", () => {
    const r = x("home loan interest 2 lakh, TDS 1.2 lakh already");
    expect(r.updates.houseProperty.homeLoanInterest).toBe(200_000);
    expect(r.updates.taxesPaid).toBe(120_000);
  });
});
