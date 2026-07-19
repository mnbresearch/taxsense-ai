import { describe, expect, it } from "vitest";
import { PRO_TOOLS, toolUnlocked } from "@/lib/pro";
import { SECTIONS } from "@/lib/sections";
import { PLAN_FEATURES } from "@/lib/entitlements";

describe("professional suite catalog (Batch 36)", () => {
  it("covers all three segments", () => {
    for (const seg of ["student", "practitioner", "firm"]) {
      expect(PRO_TOOLS.some((t) => t.segment === seg)).toBe(true);
    }
  });

  it("every student tool is free; no free tool ever locks", () => {
    for (const t of PRO_TOOLS.filter((x) => x.segment === "student")) expect(t.tier).toBe("free");
    for (const t of PRO_TOOLS.filter((x) => x.tier === "free")) {
      expect(toolUnlocked(t, null)).toBe(true);
      expect(toolUnlocked(t, PLAN_FEATURES.free)).toBe(true);
    }
  });

  it("gating matches the entitlement matrix", () => {
    const interest = PRO_TOOLS.find((t) => t.id === "interest")!;
    const clients = PRO_TOOLS.find((t) => t.id === "clients")!;
    expect(toolUnlocked(interest, PLAN_FEATURES.free)).toBe(false);
    expect(toolUnlocked(interest, PLAN_FEATURES.pro)).toBe(true);
    expect(toolUnlocked(clients, PLAN_FEATURES.pro)).toBe(false);
    expect(toolUnlocked(clients, PLAN_FEATURES.business)).toBe(true);
  });

  it("tools have unique ids and real destinations", () => {
    const ids = PRO_TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PRO_TOOLS) expect(t.href.startsWith("/")).toBe(true);
  });
});

describe("tax-law quiz (Batch 40)", async () => {
  const { QUIZ } = await import("@/lib/quiz");
  it("has 12 fully-formed questions with valid answers", () => {
    expect(QUIZ.length).toBe(12);
    for (const q of QUIZ) {
      expect(q.options.length).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(30);
      expect(q.sec.length).toBeGreaterThan(0);
    }
  });
});

describe("section quick-reference (Batch 37)", () => {
  it("has at least 20 sections, each fully written", () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(20);
    for (const s of SECTIONS) {
      expect(s.plain.length).toBeGreaterThan(30);
      expect(s.note.length).toBeGreaterThan(30);
      expect(s.tags.length).toBeGreaterThan(0);
    }
  });

  it("covers the interest trilogy and 87A", () => {
    for (const sec of ["234A", "234B", "234C", "87A"]) {
      expect(SECTIONS.some((s) => s.sec === sec)).toBe(true);
    }
  });
});
