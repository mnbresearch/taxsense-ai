/**
 * MNB Intelligence gateway slot: first in the chain when configured, invisible
 * when not, and never able to take the product down.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "../src/lib/intake/provider";

const KEYS = ["MNB_INTELLIGENCE_URL", "MNB_INTELLIGENCE_KEY", "MNB_INTELLIGENCE_MODEL", "MNB_INTELLIGENCE_TIMEOUT_MS",
  "GROQ_API_KEY", "ANTHROPIC_API_KEY", "INTAKE_PROVIDER", "LLM_FALLBACK_URL", "LLM_FALLBACK_KEY", "LLM_FALLBACK_MODEL"];
const saved: Record<string, string | undefined> = {};
const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } vi.restoreAllMocks(); });

describe("MNB Intelligence gateway", () => {
  it("is absent unless both URL and key are set", async () => {
    process.env.MNB_INTELLIGENCE_URL = "https://gw.test/v1";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const p = getProvider();
    expect(p.name).toBe("mock/deterministic");
    await p.completeJson([{ role: "user", content: "salary 12 LPA" }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is called first, with the MNB model name and the app's own messages", async () => {
    process.env.MNB_INTELLIGENCE_URL = "https://gw.test/v1/";
    process.env.MNB_INTELLIGENCE_KEY = "k";
    process.env.GROQ_API_KEY = "g";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok('{"updates":{}}'));
    const p = getProvider();
    const msgs = [{ role: "system" as const, content: "SYS" }, { role: "user" as const, content: "hi" }];
    expect(await p.completeJson(msgs)).toBe('{"updates":{}}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gw.test/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("mnb-tax-intake");
    expect(body.messages).toEqual(msgs);
    expect(body.temperature).toBe(0);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer k");
    expect(p.name).toBe("mnb-intelligence/mnb-tax-intake");
  });

  it("falls through to the direct Groq key when the gateway fails", async () => {
    process.env.MNB_INTELLIGENCE_URL = "https://gw.test/v1";
    process.env.MNB_INTELLIGENCE_KEY = "k";
    process.env.GROQ_API_KEY = "g";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).startsWith("https://gw.test") ? new Response("down", { status: 502 }) : ok("from-groq"));
    const p = getProvider();
    expect(await p.completeText([{ role: "user", content: "hi" }])).toBe("from-groq");
    expect(String(fetchMock.mock.calls[1][0])).toContain("api.groq.com");
    expect(p.name).toContain("groq/");
  });

  it("falls through when the gateway answers 200 with no content, and ends at the mock if nothing else is configured", async () => {
    process.env.MNB_INTELLIGENCE_URL = "https://gw.test/v1";
    process.env.MNB_INTELLIGENCE_KEY = "k";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const p = getProvider();
    const out = JSON.parse(await p.completeJson([{ role: "user", content: "salary 12 LPA" }]));
    expect(out.updates.salary.grossSalary).toBe(1200000);
    expect(p.name).toBe("mock/deterministic");
  });

  it("a hung gateway is cut off by the timeout and the chain continues", async () => {
    process.env.MNB_INTELLIGENCE_URL = "https://gw.test/v1";
    process.env.MNB_INTELLIGENCE_KEY = "k";
    process.env.MNB_INTELLIGENCE_TIMEOUT_MS = "50";
    process.env.GROQ_API_KEY = "g";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => String(input).startsWith("https://gw.test")
      ? new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))))
      : Promise.resolve(ok("from-groq")));
    const t0 = Date.now();
    expect(await getProvider().completeText([{ role: "user", content: "hi" }])).toBe("from-groq");
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
