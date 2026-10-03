import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";
import { PRO_TOOLS } from "@/lib/pro";

/** Every number and tool the landing page shows must match the real product. */
describe("landing page claims", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");

  it("hero example: 18 LPA, 35k rent Mumbai, 1.5L 80C, 25k 80D", () => {
    const p = emptyProfile();
    p.salary = { grossSalary: 1_800_000, basicPlusDA: 900_000, hraReceived: 360_000, rentPaid: 420_000, isMetroCity: true, employerNpsContribution: 0, professionalTax: 2_500 };
    p.deductions.section80C = 150_000;
    p.deductions.section80D_selfFamily = 25_000;
    const c = computeBoth(p);
    expect(c.old.totalTaxLiability).toBe(192_660);
    expect(c.new.totalTaxLiability).toBe(150_800);
    expect(c.recommended).toBe("new");
    expect(c.old.salaryExemptions.hraExempt).toBe(330_000);
    expect(page).toContain("₹1,92,660");
    expect(page).toContain("₹1,50,800");
    expect(page).toContain("₹41,860");
    expect(page).toContain("₹3,30,000");
  });

  it("every tool id referenced on the page exists in the catalog", () => {
    const ids = [...page.matchAll(/ToolCards ids=\{\[([^\]]+)\]\}/g)].flatMap((m) => m[1].match(/"([^"]+)"/g)!.map((s) => s.slice(1, -1)));
    expect(ids.length).toBeGreaterThan(20);
    for (const id of ids) expect(PRO_TOOLS.some((t) => t.id === id), id).toBe(true);
  });

  it("claims '280+' automated checks — keep the suite at least that large", () => {
    expect(page).toContain("280+");
  });
});
