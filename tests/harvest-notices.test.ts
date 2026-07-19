import { describe, expect, it } from "vitest";
import { LTCG_EXEMPTION, planHarvest } from "@/lib/harvest";
import { NOTICES } from "@/lib/notices";

describe("LTCG harvest planner (Batch 45)", () => {
  it("recommends the full exemption when nothing is realized", () => {
    const p = planHarvest({ realized: 0, unrealized: 500_000 });
    expect(p.harvestNow).toBe(LTCG_EXEMPTION);
    expect(p.taxSaved).toBe(Math.round(LTCG_EXEMPTION * 0.125));
  });

  it("is bounded by unrealized gains", () => {
    const p = planHarvest({ realized: 25_000, unrealized: 60_000 });
    expect(p.exemptionLeft).toBe(100_000);
    expect(p.harvestNow).toBe(60_000);
  });

  it("computes tax on realized excess and flags a used-up exemption", () => {
    const p = planHarvest({ realized: 200_000, unrealized: 100_000 });
    expect(p.fullyUsed).toBe(true);
    expect(p.harvestNow).toBe(0);
    expect(p.taxOnExcess).toBe(Math.round(75_000 * 0.125));
  });
});

describe("notice helper content (Batch 43)", () => {
  it("covers the six core notices with full playbooks", () => {
    expect(NOTICES.length).toBe(6);
    for (const n of NOTICES) {
      expect(n.meaning.length).toBeGreaterThan(60);
      expect(n.deadline.length).toBeGreaterThan(10);
      expect(n.checklist.length).toBeGreaterThanOrEqual(5);
      expect(n.escalation.length).toBeGreaterThan(20);
      expect([1, 2, 3]).toContain(n.fear);
    }
  });

  it("includes the big three: intimation, scrutiny, reassessment", () => {
    for (const id of ["143-1", "143-2", "148a"]) {
      expect(NOTICES.some((n) => n.id === id)).toBe(true);
    }
  });
});
