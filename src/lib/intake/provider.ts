/**
 * LLM provider layer (Session 3 + 7).
 * Default: Groq (llama-3.3-70b-versatile) — fast + cheap per message.
 * Fallback: Anthropic Claude (claude-haiku-4-5) — higher extraction accuracy.
 * Mock: deterministic regex extractor — the whole app runs with ZERO keys.
 *
 * Selection: INTAKE_PROVIDER env = "groq" | "anthropic" | "mock" (default:
 * groq if GROQ_API_KEY set, else anthropic if ANTHROPIC_API_KEY set, else mock).
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  name: string;
  /** JSON-mode completion (temperature 0). */
  completeJson(messages: ChatMessage[]): Promise<string>;
  /** Conversational completion. */
  completeText(messages: ChatMessage[]): Promise<string>;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

function groqProvider(apiKey: string): LlmProvider {
  async function call(messages: ChatMessage[], json: boolean): Promise<string> {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: json ? 0 : 0.4,
        max_tokens: 1024,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content as string;
  }
  return {
    name: `groq/${GROQ_MODEL}`,
    completeJson: (m) => call(m, true),
    completeText: (m) => call(m, false),
  };
}

function anthropicProvider(apiKey: string): LlmProvider {
  async function call(messages: ChatMessage[], json: boolean): Promise<string> {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const rest = messages.filter((m) => m.role !== "system");
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        system: json ? system + "\nRespond with ONLY valid JSON." : system,
        messages: rest,
        temperature: json ? 0 : 0.4,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text as string;
  }
  return {
    name: `anthropic/${ANTHROPIC_MODEL}`,
    completeJson: (m) => call(m, true),
    completeText: (m) => call(m, false),
  };
}

/* ------------------------------ Mock mode ------------------------------ */
/** Deterministic extractor so the product demos with no API keys.
 *  Handles: "80k a month", "12 LPA", "1.5 lakh in PPF", "no house", etc. */
export function mockExtract(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  const updates: any = {};
  const notApplicable: string[] = [];
  const estimates: string[] = [];

  const amount = (raw: string, unit?: string): number => {
    let n = parseFloat(raw.replace(/,/g, ""));
    if (!unit) return n;
    if (/lpa|lakh|lac|l\b/.test(unit)) n *= 100_000;
    else if (/cr|crore/.test(unit)) n *= 10_000_000;
    else if (/k\b/.test(unit)) n *= 1_000;
    return n;
  };
  const re = /(?:₹|rs\.?\s*)?([\d,.]+)\s*(lpa|lakhs?|lacs?|crores?|cr|k|l)?\s*(?:per month|a month|\/month|monthly|pm)?/i;

  const salaryMatch = msg.match(
    /(?:salary|ctc|earn|package|gross)[^\d₹]*(?:₹|rs\.?\s*)?([\d,.]+)\s*(lpa|lakhs?|lacs?|crores?|cr|k|l)?\s*(per month|a month|\/month|monthly|pm)?/i
  );
  if (salaryMatch) {
    let n = amount(salaryMatch[1], salaryMatch[2]);
    if (salaryMatch[3]) n *= 12;
    updates.salary = { grossSalary: Math.round(n) };
    if (/around|about|roughly|approx|~/.test(msg)) estimates.push(`salary ≈ ₹${n}`);
  }
  const rentMatch = msg.match(/rent[^\d₹]*(?:₹|rs\.?\s*)?([\d,.]+)\s*(k|lakhs?|l)?\s*(per month|a month|\/month|monthly|pm)?/i);
  if (rentMatch) {
    let n = amount(rentMatch[1], rentMatch[2]);
    if (rentMatch[3] || n < 100_000) n *= rentMatch[3] ? 12 : 12; // rent quoted monthly by default
    updates.salary = { ...(updates.salary ?? {}), rentPaid: Math.round(n) };
  }
  if (/(no|don'?t own a?) house/.test(msg)) notApplicable.push("houseProperty");
  if (/(no|don'?t) (trade|stocks|shares|mutual funds)/.test(msg)) notApplicable.push("capitalGains");
  // amount may come before OR after the 80C keyword
  const c80 =
    msg.match(/(?:ppf|elss|80c|lic|epf|pf)[^\d₹]*(?:₹|rs\.?\s*)?([\d,.]+)\s*(lakhs?|lacs?|k|l)?/i) ??
    msg.match(/(?:₹|rs\.?\s*)?([\d,.]+)\s*(lakhs?|lacs?|k|l)?\s*(?:in|into|to)?\s*(?:ppf|elss|80c|lic|epf)/i);
  if (c80) updates.deductions = { section80C: Math.round(amount(c80[1], c80[2])) };

  return JSON.stringify({ updates, notApplicable, estimates, clarify: null });
}

function mockProvider(): LlmProvider {
  return {
    name: "mock/deterministic",
    completeJson: async (m) => mockExtract(m[m.length - 1]?.content ?? ""),
    completeText: async () =>
      "Got it — noted. (Demo mode: add a GROQ_API_KEY to enable the full conversational experience.) What else should I know — any deductions like PF, PPF or health insurance?",
  };
}

export function getProvider(): LlmProvider {
  const forced = process.env.INTAKE_PROVIDER;
  if (forced === "mock") return mockProvider();
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY)
    return anthropicProvider(process.env.ANTHROPIC_API_KEY);
  if (process.env.GROQ_API_KEY) return groqProvider(process.env.GROQ_API_KEY);
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider(process.env.ANTHROPIC_API_KEY);
  return mockProvider();
}
