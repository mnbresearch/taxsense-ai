/** Glossary fast-path tests (feature batch 4). */
import { describe, expect, it } from "vitest";
import { GLOSSARY, glossaryAnswer } from "../src/lib/glossary";

describe("glossary matching", () => {
  it("answers 'what is 87A?'", () => {
    const g = glossaryAnswer("what is 87A?")!;
    expect(g.term).toMatch(/87A/);
    expect(g.answer).toMatch(/12,00,000|₹12/);
  });

  it("longest key wins: 80CCD(1B) beats 80C", () => {
    const g = glossaryAnswer("explain 80ccd(1b) please")!;
    expect(g.term).toMatch(/NPS/);
  });

  it("Hinglish trigger works", () => {
    const g = glossaryAnswer("HRA kya hota hai")!;
    expect(g.term).toMatch(/HRA/);
  });

  it("does NOT intercept income statements (numbers must reach the LLM)", () => {
    expect(glossaryAnswer("I put 1.5 lakh in 80C this year")).toBeNull();
    expect(glossaryAnswer("my salary is 80k a month")).toBeNull();
  });

  it("does not fire on unknown terms", () => {
    expect(glossaryAnswer("what is the meaning of life?")).toBeNull();
  });

  it("every entry has non-trivial keys and answer", () => {
    for (const e of GLOSSARY) {
      expect(e.keys.length).toBeGreaterThan(0);
      expect(e.answer.length).toBeGreaterThan(80);
    }
  });

  it("all keys resolve to their own entry via a question", () => {
    for (const e of GLOSSARY) {
      const g = glossaryAnswer(`what is ${e.keys[0]}?`);
      expect(g?.term).toBe(e.term);
    }
  });
});
