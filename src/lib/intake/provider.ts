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
/** Batch 83 — model fallback: separate rate-limit pools, survives deprecations. */
const GROQ_MODELS = [
  process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter((v, i, a) => a.indexOf(v) === i);
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

function groqProvider(apiKey: string): LlmProvider {
  async function call(messages: ChatMessage[], json: boolean): Promise<string> {
    let lastErr: unknown = new Error("no groq models configured");
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages,
            temperature: json ? 0 : 0.4,
            max_tokens: 1024,
            ...(json ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (!res.ok) throw new Error(`Groq ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json();
        return data.choices[0].message.content as string;
      } catch (e) {
        lastErr = e;
        console.error("[intake] groq model failed:", String((e as Error)?.message).slice(0, 200));
      }
    }
    throw lastErr;
  }
  return {
    name: `groq/${GROQ_MODELS[0]}`,
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

  const toAmt = (raw: string, unit?: string): number => {
    let n = parseFloat(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) return 0;
    const u = (unit ?? "").trim();
    if (/^(lpa|lakhs?|lacs?|l)$/.test(u)) n *= 100_000;
    else if (/^(crores?|cr)$/.test(u)) n *= 10_000_000;
    else if (/^k$/.test(u)) n *= 1_000;
    return Math.round(n);
  };
  const NUM = "(?:₹|rs\\.?\\s*)?([\\d,]+(?:\\.\\d+)?)\\s*(lpa|lakhs?|lacs?|crores?|cr|k|l\\b)?";
  const MONTHLY = "(?:per month|a month|\\/month|monthly|pm\\b)";
  const grab = (re: RegExp): number => {
    const m = msg.match(re);
    if (!m) return 0;
    let n = toAmt(m[1], m[2]);
    if (m[3]) n *= 12; // explicit monthly
    return n;
  };

  // Salary — keyword before ("salary is 18 lakh") or after ("22 lpa package").
  let salary =
    grab(new RegExp(`(?:salary|ctc|package|gross|income|earn(?:ing)?s?)\\D{0,16}${NUM}\\s*(${MONTHLY})?`, "i")) ||
    grab(new RegExp(`${NUM}\\s*(${MONTHLY})?\\s*(?:lpa|salary|ctc|package)`, "i"));
  if (salary > 0 && salary < 300_000 && / (a month|per month|monthly|pm)/.test(msg)) salary *= 1; // already annualised by grab
  if (salary > 0) {
    updates.salary = { grossSalary: salary };
    if (/around|about|roughly|approx|~/.test(msg)) estimates.push(`salary ≈ ₹${salary.toLocaleString("en-IN")} — parsed from your message`);
  }

  // Rent — "rent 35k", "35k rent", "paying 30000 rent"; monthly by default when small.
  let rent =
    grab(new RegExp(`(?:rent(?:ing)?(?:\\s+of)?|pay(?:ing)?\\s+rent(?:\\s+of)?)\\D{0,10}${NUM}\\s*(${MONTHLY})?`, "i")) ||
    grab(new RegExp(`${NUM}\\s*(${MONTHLY})?\\s*(?:as\\s+)?rent`, "i"));
  if (rent > 0) {
    if (rent < 100_000) rent *= 12; // quoted monthly
    updates.salary = { ...(updates.salary ?? {}), rentPaid: rent };
  }
  // HRA metro limb applies ONLY to Delhi/Mumbai/Kolkata/Chennai.
  if (/(delhi|new delhi|mumbai|bombay|kolkata|calcutta|chennai|madras)/.test(msg))
    updates.salary = { ...(updates.salary ?? {}), isMetroCity: true };
  else if (/(bangalore|bengaluru|pune|hyderabad|gurgaon|gurugram|noida|ahmedabad|jaipur|kochi|indore)/.test(msg))
    updates.salary = { ...(updates.salary ?? {}), isMetroCity: false };

  // 80C — amount-first pattern is more precise, try it first; ignore < ₹1,000.
  const c80 =
    grab(new RegExp(`${NUM}\\s*()(?:in|into|to|towards)?\\s*(?:ppf|elss|lic|epf|nsc|80c)`, "i")) ||
    grab(new RegExp(`(?:ppf|elss|lic|epf|nsc|80c)\\D{0,10}${NUM}()`, "i"));
  if (c80 >= 1_000) updates.deductions = { ...(updates.deductions ?? {}), section80C: c80 };

  // NPS beyond 80C.
  const nps = grab(new RegExp(`${NUM}\\s*()(?:in|into|to)?\\s*nps`, "i")) || grab(new RegExp(`nps\\D{0,10}${NUM}()`, "i"));
  if (nps >= 1_000) updates.deductions = { ...(updates.deductions ?? {}), section80CCD1B: Math.min(nps, 50_000) };

  // Health insurance → 80D.
  const d80 = grab(new RegExp(`(?:health insurance|mediclaim|80d)\\D{0,12}${NUM}()`, "i")) || grab(new RegExp(`${NUM}\\s*()(?:for|on|in)?\\s*(?:health insurance|mediclaim|80d)`, "i"));
  if (d80 >= 500) updates.deductions = { ...(updates.deductions ?? {}), section80D_selfFamily: d80 };

  // Interest income — FD and savings.
  const fd = grab(new RegExp(`(?:fd|fixed deposit)s?\\s*interest\\D{0,10}${NUM}()`, "i")) || grab(new RegExp(`${NUM}\\s*()(?:of\\s+)?(?:fd|fixed deposit)s?\\s*interest`, "i"));
  if (fd > 0) updates.otherSources = { ...(updates.otherSources ?? {}), fdInterest: fd };
  const sav = grab(new RegExp(`savings\\s*(?:account\\s*)?interest\\D{0,10}${NUM}()`, "i")) || grab(new RegExp(`${NUM}\\s*()savings\\s*(?:account\\s*)?interest`, "i"));
  if (sav > 0) updates.otherSources = { ...(updates.otherSources ?? {}), savingsInterest: sav };
  const div = grab(new RegExp(`dividends?\\D{0,10}${NUM}()`, "i")) || grab(new RegExp(`${NUM}\\s*()(?:in|of|as)?\\s*dividends?`, "i"));
  if (div > 0) updates.otherSources = { ...(updates.otherSources ?? {}), dividends: div };

  // Capital gains — equity profit; holding period decides LTCG vs STCG.
  if (/(shares?|stocks?|mutual funds?|equity)/.test(msg)) {
    const gain =
      grab(new RegExp(`(?:profit|gains?)\\s*(?:of)?\\D{0,6}${NUM}()`, "i")) ||
      grab(new RegExp(`${NUM}\\s*()(?:profit|gains?)`, "i"));
    if (gain > 0) {
      const held = msg.match(/held\s*(?:for|over|more than)?\s*([\d.]+)\s*(year|yr|month|mo)/);
      const longTerm = held ? (/year|yr/.test(held[2]) ? parseFloat(held[1]) >= 1 : parseFloat(held[1]) > 12) : /long[- ]?term|ltcg/.test(msg);
      updates.capitalGains = longTerm ? { ltcg112A: gain } : { stcg111A: gain };
    }
  }

  // Home-loan interest.
  const hli = grab(new RegExp(`(?:home|housing)\\s*loan[^.]{0,25}?interest\\D{0,10}${NUM}()`, "i")) || grab(new RegExp(`${NUM}\\s*()(?:home|housing)\\s*loan\\s*interest`, "i"));
  if (hli > 0) updates.houseProperty = { use: "self-occupied", homeLoanInterest: hli };

  // TDS / taxes already paid.
  const tds = grab(new RegExp(`(?:tds|advance tax|tax (?:deducted|paid))\\D{0,12}${NUM}()`, "i"));
  if (tds > 0) updates.taxesPaid = tds;

  // Explicit denials.
  if (/(no|don'?t own a?|not own(?:ing)? a?) (house|property|flat)/.test(msg)) notApplicable.push("houseProperty");
  if (/(no|don'?t|didn'?t) (trade|sell|stocks?|shares?|mutual funds?|capital gains?)/.test(msg)) notApplicable.push("capitalGains");
  if (/no (other|interest|fd) income/.test(msg)) notApplicable.push("otherSources");

  return JSON.stringify({ updates, notApplicable, estimates, clarify: null });
}

function mockProvider(): LlmProvider {
  return {
    name: "mock/deterministic",
    completeJson: async (m) => mockExtract(m[m.length - 1]?.content ?? ""),
    completeText: async () =>
      "Got it — noted, and the numbers on the right update live. What else should I know — any deductions like PF, PPF or health insurance, or interest income?",
  };
}

/**
 * Batch 83 — resilient chain. A dead key, exhausted quota or deprecated
 * model must NEVER silently lobotomise the product: each call walks the
 * chain (Groq → Anthropic → deterministic mock extractor) and reports the
 * provider that actually answered, so degradation is visible in telemetry.
 */
function chainProvider(providers: LlmProvider[]): LlmProvider {
  let last = providers[0]?.name ?? "mock/deterministic";
  async function tryAll(fn: (p: LlmProvider) => Promise<string>): Promise<string> {
    let err: unknown = new Error("no providers");
    for (const p of providers) {
      try {
        const out = await fn(p);
        last = p.name;
        return out;
      } catch (e) {
        err = e;
        console.error(`[intake] provider ${p.name} failed:`, String((e as Error)?.message).slice(0, 200));
      }
    }
    throw err;
  }
  return {
    get name() {
      return last;
    },
    completeJson: (m) => tryAll((p) => p.completeJson(m)),
    completeText: (m) => tryAll((p) => p.completeText(m)),
  };
}

export function getProvider(): LlmProvider {
  const forced = process.env.INTAKE_PROVIDER;
  if (forced === "mock") return mockProvider();
  const chain: LlmProvider[] = [];
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    chain.push(anthropicProvider(process.env.ANTHROPIC_API_KEY));
    if (process.env.GROQ_API_KEY) chain.push(groqProvider(process.env.GROQ_API_KEY));
  } else {
    if (process.env.GROQ_API_KEY) chain.push(groqProvider(process.env.GROQ_API_KEY));
    if (process.env.ANTHROPIC_API_KEY) chain.push(anthropicProvider(process.env.ANTHROPIC_API_KEY));
  }
  chain.push(mockProvider());
  return chain.length === 1 ? chain[0] : chainProvider(chain);
}
