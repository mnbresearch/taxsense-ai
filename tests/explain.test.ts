import { describe, it, expect } from "vitest";
import { computeBoth } from "../src/lib/tax-engine";
import { safeParseProfile } from "../src/lib/tax-engine/validate";
import { explainRegime, explainReconciles } from "../src/lib/explain";

function comps(raw: any) {
  const p = safeParseProfile(raw);
  if (!p.ok) throw new Error("bad");
  return computeBoth(p.profile);
}

const CASES: Record<string, any> = {
  "salaried 18.5L": { age: 30, residentialStatus: "resident", salary: { grossSalary: 1850000, professionalTax: 2400 }, houseProperties: [], deductions: { section80C: 150000 } },
  "marginal relief 12.85L": { age: 30, residentialStatus: "resident", salary: { grossSalary: 1285000 }, houseProperties: [], deductions: {} },
  "surcharge 51L": { age: 30, residentialStatus: "resident", salary: { grossSalary: 5100000 }, houseProperties: [], deductions: {} },
  "senior FD 6L": { age: 68, residentialStatus: "resident", otherSources: { fdInterest: 600000 }, houseProperties: [], deductions: {} },
  "LTCG only 5L": { age: 30, residentialStatus: "resident", capitalGains: { ltcg112A: 500000 }, houseProperties: [], deductions: {} },
  "44ADA 15L": { age: 30, residentialStatus: "resident", business: { netIncome: 1500000, presumptive: true }, houseProperties: [], deductions: {} },
};

describe("explainRegime — every step reconciles to the engine", () => {
  for (const [name, raw] of Object.entries(CASES)) {
    it(`${name}: both regimes reconcile to the rupee`, () => {
      const c = comps(raw);
      expect(explainReconciles(c.old)).toBe(true);
      expect(explainReconciles(c.new)).toBe(true);
    });
  }
});

describe("explainRegime — structure", () => {
  const c = comps(CASES["salaried 18.5L"]);
  const steps = explainRegime(c.old);
  it("has a Gross Total Income line", () => expect(steps.some((s) => s.label === "Gross Total Income")).toBe(true));
  it("ends with a payable-or-refund final line", () => {
    const last = steps[steps.length - 1];
    expect(/PAYABLE|Refund/.test(last.label)).toBe(true);
    expect(last.group).toBe("final");
  });
  it("shows slab-by-slab tax lines", () => expect(steps.some((s) => /Tax on .* @ \d+%/.test(s.label))).toBe(true));
  it("carries the effective-rate note on the total", () => {
    expect(steps.some((s) => s.label === "Total Tax Liability" && /Effective rate/.test(s.note ?? ""))).toBe(true);
  });
  it("old regime shows 80C as a deduction line", () => {
    expect(steps.some((s) => /80C/.test(s.label) && s.amount < 0)).toBe(true);
  });
});

describe("explainRegime — marginal relief is shown as its own line", () => {
  it("12.85L new regime lists an 87A marginal relief line", () => {
    const c = comps(CASES["marginal relief 12.85L"]);
    const steps = explainRegime(c.new);
    expect(steps.some((s) => /marginal relief/i.test(s.label))).toBe(true);
  });
});
