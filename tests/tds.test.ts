import { describe, expect, it } from "vitest";
import { parse26AS, reconcile } from "@/lib/tds";

const SAMPLE = `
Part A - Details of Tax Deducted at Source
ACME TECHNOLOGIES PVT LTD MUMB01234A 192 31-Mar-2026 1,20,000.00 12,000.00 12,000.00
HDFC BANK LTD MUMH05678B 194A 15-Jun-2025 45,000.00 4,500.00 4,500.00
SHARP CLIENT LLP DELS01111C 194J 20-Sep-2025 2,00,000.00 20,000.00 20,000.00
HDFC BANK LTD MUMH05678B 194A 15-Jun-2025 45,000.00 4,500.00 4,500.00
Some unrelated narration line with no section
`;

describe("26AS parser (Batch 41)", () => {
  it("extracts entries with section, deductor and the deducted amount", () => {
    const r = parse26AS(SAMPLE);
    expect(r.entries.length).toBe(3); // exact duplicate row dropped
    const s192 = r.entries.find((e) => e.section === "192")!;
    expect(s192.amount).toBe(12_000);
    expect(s192.deductor).toMatch(/ACME/i);
  });

  it("totals and groups by section", () => {
    const r = parse26AS(SAMPLE);
    expect(r.total).toBe(12_000 + 4_500 + 20_000);
    expect(r.bySection["194A"]).toBe(4_500);
    expect(r.bySection["194J"]).toBe(20_000);
  });

  it("ignores text without sections or amounts", () => {
    const r = parse26AS("hello world\nno tax here at all");
    expect(r.entries.length).toBe(0);
    expect(r.total).toBe(0);
  });

  it("reconciles against the claimed figure", () => {
    const r = parse26AS(SAMPLE);
    expect(reconcile(r, 36_500).verdict).toBe("match");
    expect(reconcile(r, 30_000).verdict).toBe("claim-more");
    expect(reconcile(r, 50_000).verdict).toBe("claim-less");
  });
});
