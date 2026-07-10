/** CTC Designer tests (feature batch 8). */
import { describe, expect, it } from "vitest";
import { optimizeStructure } from "../src/lib/optimizer/structure";

describe("salary structure optimizer", () => {
  const renter = { ctc: 2_400_000, rentPaid: 480_000, isMetroCity: true, age: 30 };

  it("the recommended structure beats a naive 40%-basic/no-NPS structure", () => {
    const r = optimizeStructure({ ...renter, currentBasicPct: 40, currentEmployerNpsPct: 0 });
    expect(r.best.bestTax).toBeLessThanOrEqual(r.current!.bestTax);
    expect(r.savingsVsCurrent).not.toBeNull();
    expect(r.savingsVsCurrent!).toBeGreaterThan(0);
  });

  it("employer NPS is always maxed in the best structure (it's free tax relief)", () => {
    const r = optimizeStructure(renter);
    expect(r.best.employerNpsPct).toBe(14);
  });

  it("every option's numbers are internally consistent", () => {
    const r = optimizeStructure(renter);
    for (const o of r.options) {
      expect(o.bestTax).toBe(Math.min(o.oldTax, o.newTax));
      expect(o.basicPlusDA).toBe(Math.round((o.basicPct / 100) * renter.ctc));
      expect(o.employerNps).toBe(Math.round((o.employerNpsPct / 100) * o.basicPlusDA));
      expect(o.wageCodeAligned).toBe(o.basicPct >= 50);
    }
    // sorted best-first
    for (let i = 1; i < r.options.length; i++)
      expect(r.options[i - 1].bestTax).toBeLessThanOrEqual(r.options[i].bestTax);
  });

  it("high rent in a metro pushes toward higher basic (bigger HRA exemption) in the old regime", () => {
    const heavyRenter = optimizeStructure({ ctc: 3_000_000, rentPaid: 900_000, isMetroCity: true, age: 32 });
    // the best OLD-regime tax among high-basic options should beat low-basic ones
    const lowBasic = heavyRenter.options.filter((o) => o.basicPct === 35 && o.employerNpsPct === 14)[0];
    const highBasic = heavyRenter.options.filter((o) => o.basicPct === 60 && o.employerNpsPct === 14)[0];
    expect(highBasic.oldTax).toBeLessThan(lowBasic.oldTax);
  });

  it("no rent → note that HRA is dead weight", () => {
    const r = optimizeStructure({ ctc: 2_000_000, rentPaid: 0, isMetroCity: false, age: 28 });
    expect(r.notes.join(" ")).toMatch(/dead weight/);
  });

  it("wage-code note appears only when the best structure has basic < 50%", () => {
    const r = optimizeStructure(renter);
    const hasNote = r.notes.some((n) => n.includes("Wage Code"));
    expect(hasNote).toBe(!r.best.wageCodeAligned);
  });
});
