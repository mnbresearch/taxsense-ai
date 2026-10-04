import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { redactPII, looksLikeDocument } from "@/lib/intake/pii";
import { isUndeliverable } from "@/lib/email";

const FORM16 = `FORM NO. 16 [See rule 31(1)(a)] PART B
Certificate under section 203 of the Income-tax Act, 1961
PAN of the Employee: ABCPK1234L   TAN of the Deductor: DELA12345B
1. Gross Salary
(a) Salary as per provisions contained in section 17(1)   18,00,000.00
House rent allowance under section 10(13A)   3,30,000.00
Tax on employment under section 16(iii)   2,500.00
Deduction under section 80C   1,50,000.00`;

describe("PII redaction", () => {
  it("strips PAN, TAN and Aadhaar", () => {
    const r = redactPII("my PAN ABCPK1234L, TAN DELA12345B, aadhaar 1234 5678 9012");
    expect(r).not.toMatch(/ABCPK1234L|DELA12345B|1234 5678 9012/);
  });
  it("leaves rupee amounts alone", () => {
    expect(redactPII("I earn 18,00,000 and pay 35000 rent")).toBe("I earn 18,00,000 and pay 35000 rent");
  });
  it("detects a pasted Form 16 but not normal chat", () => {
    expect(looksLikeDocument(FORM16)).toBe(true);
    expect(looksLikeDocument("I earn about 80k a month and pay rent in Pune")).toBe(false);
  });
});

describe("undeliverable domains", () => {
  it("blocks reserved test domains only", () => {
    expect(isUndeliverable("a@example.com")).toBe(true);
    expect(isUndeliverable("x@foo.test")).toBe(true);
    expect(isUndeliverable("real.person@gmail.com")).toBe(false);
  });
});

describe("chat: pasted Form 16 never reaches an LLM", () => {
  afterEach(() => vi.restoreAllMocks());
  it("parses locally and returns the amounts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network must not be used"));
    const { POST } = await import("@/app/api/chat/route");
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9" },
      body: JSON.stringify({ message: FORM16 }),
    });
    const res = await POST(req);
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d.provider).toBe("docimport/local");
    expect(d.state.profile.salary.grossSalary).toBe(1_800_000);
    expect(d.reply).not.toContain("ABCPK1234L");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
