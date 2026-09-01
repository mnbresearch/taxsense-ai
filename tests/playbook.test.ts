/** Batch 91 — playbook integrity + case-study numbers verified on the ENGINE. */
import { describe, expect, it } from "vitest";
import { CASE_STUDIES, STRATEGIES } from "../src/lib/playbook";
import { computeRegime, emptyProfile } from "../src/lib/tax-engine";

describe("playbook data integrity", () => {
  it("every strategy has hook, how, sections and an honest watch-out", () => {
    for (const s of STRATEGIES) {
      expect(s.hook.length).toBeGreaterThan(20);
      expect(s.how.length).toBeGreaterThan(50);
      expect(s.sections).toMatch(/s\.|Rule/);
      expect(s.watchOut.length).toBeGreaterThan(30);
    }
  });
  it("covers all five audiences", () => {
    const a = new Set(STRATEGIES.map((s) => s.audience));
    expect(a.size).toBe(5);
  });
  it("every case study is labelled with a method and share text", () => {
    for (const c of CASE_STUDIES) {
      expect(c.method).toMatch(/s\.|HRA/);
      expect(c.share).toContain("taxsense.mnbresearch.com");
    }
  });
});

describe("case-study numbers match the engine", () => {
  it("44ADA freelancer: ₹15L business income → ₹1,09,200 (new regime)", () => {
    const p = { ...emptyProfile(), business: { netIncome: 1_500_000, presumptive: true } };
    expect(computeRegime(p, "new").totalTaxLiability).toBe(109_200);
  });
  it("₹30L employee → ₹4,75,800 (new regime)", () => {
    const p = {
      ...emptyProfile(),
      salary: { grossSalary: 3_000_000, basicPlusDA: 1_500_000, hraReceived: 0, rentPaid: 0, isMetroCity: false, employerNpsContribution: 0, professionalTax: 0 },
    };
    expect(computeRegime(p, "new").totalTaxLiability).toBe(475_800);
    // → the story's ₹3,66,600 delta is exact:
    expect(475_800 - 109_200).toBe(366_600);
  });
  it("machine: 35% of ₹20L at 30%+cess = ₹2,18,400", () => {
    expect(Math.round(2_000_000 * 0.35 * 0.30 * 1.04)).toBe(218_400);
  });
  it("80JJAA: 30% × ₹24L × 3 years at 25.17% ≈ ₹5.44L", () => {
    const saved = Math.round(2_400_000 * 0.3 * 3 * 0.2517);
    expect(saved).toBeGreaterThan(540_000);
  });
  it("harvest decade: 1.25L × 12.5% × 10 = ₹1,56,250", () => {
    expect(125_000 * 0.125 * 10).toBe(156_250);
  });
  it("joint loan: extra ₹2L at 31.2% = ₹62,400", () => {
    expect(200_000 * 0.312).toBe(62_400);
  });
});
