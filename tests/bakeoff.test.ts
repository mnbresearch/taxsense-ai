/** The bake-off harness must itself be trustworthy: test the scorer. */
import { describe, expect, it } from "vitest";
import { CASES, score } from "../scripts/bakeoff";

describe("bake-off harness", () => {
  it("has 5 labelled cases", () => {
    expect(CASES.length).toBe(5);
  });

  it("scores a perfect extraction 100%", () => {
    const perfect = JSON.stringify({
      updates: { salary: { grossSalary: 960000, rentPaid: 216000, isMetroCity: false }, deductions: { section80C: 21600 } },
      notApplicable: [], estimates: [], clarify: null,
    });
    const s = score(perfect, CASES[0].truth);
    expect(s.hits).toBe(s.total);
  });

  it("scores invalid JSON as 0 with a diagnostic", () => {
    const s = score("not json at all", CASES[0].truth);
    expect(s.hits).toBe(0);
    expect(s.misses[0]).toMatch(/INVALID/);
  });

  it("tolerates 2% numeric wiggle, not more", () => {
    const near = JSON.stringify({ updates: { salary: { grossSalary: 959000 } }, notApplicable: [], estimates: [], clarify: null });
    expect(score(near, { "salary.grossSalary": 960000 }).hits).toBe(1);
    const far = JSON.stringify({ updates: { salary: { grossSalary: 900000 } }, notApplicable: [], estimates: [], clarify: null });
    expect(score(far, { "salary.grossSalary": 960000 }).hits).toBe(0);
  });
});
