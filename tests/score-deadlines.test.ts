import { describe, expect, it } from "vitest";
import { computeBoth, emptyProfile } from "../src/lib/tax-engine";
import { computeTaxScore } from "../src/lib/tax-engine/score";
import { deadlinesInDays, upcomingDeadlines, DEADLINES } from "../src/lib/deadlines";

function salaried(gross: number) {
  const p = emptyProfile();
  p.salary = {
    grossSalary: gross, basicPlusDA: gross / 2, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  };
  return p;
}

describe("Tax Health Score", () => {
  it("scores an unoptimised profile low and gives tips", () => {
    const p = salaried(2_400_000); // high income, zero deductions, nothing paid
    const s = computeTaxScore(p, computeBoth(p));
    expect(s.score).toBeLessThan(45);
    expect(["C", "D"]).toContain(s.grade);
    expect(s.dimensions.some((d) => d.tip)).toBe(true);
  });

  it("scores a fully optimised profile A+", () => {
    const p = salaried(2_400_000);
    p.salary!.employerNpsContribution = 100_000;
    p.deductions.section80C = 150_000;
    p.deductions.section80CCD1B = 50_000;
    p.deductions.section80D_selfFamily = 25_000;
    const c = computeBoth(p);
    p.taxesPaid = c[c.recommended].totalTaxLiability; // fully covered
    const s = computeTaxScore(p, computeBoth(p));
    expect(s.score).toBeGreaterThanOrEqual(85);
    expect(s.grade).toBe("A+");
  });

  it("zero-liability profile is not penalised on advance tax", () => {
    const p = salaried(600_000); // rebate → zero tax
    const s = computeTaxScore(p, computeBoth(p));
    const adv = s.dimensions.find((d) => d.key === "advtax")!;
    expect(adv.earned).toBe(adv.max);
  });

  it("is deterministic", () => {
    const p = salaried(1_200_000);
    const a = computeTaxScore(p, computeBoth(p));
    const b = computeTaxScore(p, computeBoth(p));
    expect(a).toEqual(b);
  });
});

describe("Deadline calendar", () => {
  it("finds the ITR deadline exactly 7 days out", () => {
    const d = deadlinesInDays(new Date("2026-07-24T10:00:00+05:30"), 7);
    expect(d.some((x) => x.label.includes("ITR filing due date"))).toBe(true);
  });

  it("finds nothing on a quiet day", () => {
    expect(deadlinesInDays(new Date("2026-08-20T10:00:00+05:30"), 7)).toHaveLength(0);
  });

  it("upcoming list is ordered and bounded", () => {
    const u = upcomingDeadlines(new Date("2026-07-13T10:00:00+05:30"), 3);
    expect(u).toHaveLength(3);
    expect(u[0].date >= "2026-07-13").toBe(true);
  });

  it("all deadline dates are valid ISO days", () => {
    for (const d of DEADLINES) expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
