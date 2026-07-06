/**
 * Session 7 — intake-extraction bake-off harness.
 *
 * Runs the SAME 5 realistic test conversations through any configured
 * providers/models and scores extraction accuracy field-by-field against
 * hand-labelled ground truth. Zero keys → scores the built-in mock so the
 * harness itself is testable.
 *
 * Usage:
 *   GROQ_API_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/bakeoff.ts
 *   (set GROQ_MODELS="llama-3.3-70b-versatile,llama-3.1-8b-instant" to sweep)
 */
import { EXTRACTION_SYSTEM_PROMPT } from "../src/lib/intake/prompts";
import { ExtractionSchema } from "../src/lib/intake/schema";
import { mockExtract } from "../src/lib/intake/provider";

interface Case {
  name: string;
  message: string;
  truth: Record<string, number | boolean | string>;
}

/** 5 test conversations with hand-labelled ground truth (leaf-path → value). */
export const CASES: Case[] = [
  {
    name: "fresh salaried employee",
    message:
      "hi, first job, I get around 80k a month plus a bonus sometimes. I pay 18k rent in Bangalore. company deducts pf, maybe 21600 a year",
    truth: {
      "salary.grossSalary": 960000,
      "salary.rentPaid": 216000,
      "salary.isMetroCity": false,
      "deductions.section80C": 21600,
    },
  },
  {
    name: "rental income owner",
    message:
      "I own a flat in Pune that I rent out for 25k a month, paid about 8000 municipal tax, and the home loan interest was 2.4 lakh this year. my salary is 22 LPA",
    truth: {
      "houseProperty.use": "let-out",
      "houseProperty.annualRent": 300000,
      "houseProperty.municipalTaxes": 8000,
      "houseProperty.homeLoanInterest": 240000,
      "salary.grossSalary": 2200000,
    },
  },
  {
    name: "freelancer",
    message:
      "I'm a freelance designer, made about 14 lakhs after expenses this year, I use the 50% presumptive thing. no house, no stocks",
    truth: {
      "business.netIncome": 1400000,
      "business.presumptive": true,
    },
  },
  {
    name: "stock seller",
    message:
      "sold some shares — held infosys for 2 years, gain was 1.8 lakh, and flipped some others within 3 months for 60k profit. also got 12k dividends",
    truth: {
      "capitalGains.ltcg112A": 180000,
      "capitalGains.stcg111A": 60000,
      "otherSources.dividends": 12000,
    },
  },
  {
    name: "senior citizen",
    message:
      "I am 67, pension of 40k per month, FD interest around 2.6 lakh a year and 30k savings interest. I pay 48000 health insurance for myself",
    truth: {
      age: 67,
      "salary.grossSalary": 480000,
      "otherSources.fdInterest": 260000,
      "otherSources.savingsInterest": 30000,
      "deductions.section80D_selfFamily": 48000,
    },
  },
];

const leaf = (obj: any, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);

export function score(extractionJson: string, truth: Case["truth"]): { hits: number; total: number; misses: string[] } {
  let parsed: any;
  try {
    parsed = ExtractionSchema.parse(JSON.parse(extractionJson));
  } catch {
    return { hits: 0, total: Object.keys(truth).length, misses: ["INVALID JSON/SCHEMA"] };
  }
  const misses: string[] = [];
  let hits = 0;
  for (const [path, expected] of Object.entries(truth)) {
    const got = leaf(parsed.updates, path);
    const ok =
      typeof expected === "number"
        ? typeof got === "number" && Math.abs(got - expected) / Math.max(expected, 1) < 0.02
        : got === expected;
    if (ok) hits++;
    else misses.push(`${path}: expected ${expected}, got ${JSON.stringify(got)}`);
  }
  return { hits, total: Object.keys(truth).length, misses };
}

async function callGroq(model: string, key: string, message: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(model: string, key: string, message: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT + "\nRespond with ONLY valid JSON.",
      messages: [{ role: "user", content: message }],
    }),
  });
  const data = await res.json();
  return data.content[0].text;
}

async function main() {
  const contenders: { name: string; run: (msg: string) => Promise<string> }[] = [
    { name: "mock/deterministic", run: async (m) => mockExtract(m) },
  ];
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey)
    for (const m of (process.env.GROQ_MODELS ?? "llama-3.3-70b-versatile,llama-3.1-8b-instant").split(","))
      contenders.push({ name: `groq/${m}`, run: (msg) => callGroq(m.trim(), groqKey, msg) });
  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (anthKey)
    for (const m of (process.env.ANTHROPIC_MODELS ?? "claude-haiku-4-5,claude-sonnet-5").split(","))
      contenders.push({ name: `anthropic/${m}`, run: (msg) => callAnthropic(m.trim(), anthKey, msg) });

  console.log(`Running ${CASES.length} cases × ${contenders.length} contenders…\n`);
  for (const c of contenders) {
    let hits = 0, total = 0;
    const t0 = Date.now();
    for (const tc of CASES) {
      try {
        const out = await c.run(tc.message);
        const s = score(out, tc.truth);
        hits += s.hits;
        total += s.total;
        if (s.misses.length) console.log(`  [${c.name}] ${tc.name}: ${s.hits}/${s.total}  misses → ${s.misses.join(" | ")}`);
      } catch (e: any) {
        total += Object.keys(tc.truth).length;
        console.log(`  [${c.name}] ${tc.name}: ERROR ${e.message}`);
      }
    }
    console.log(`${c.name}: ${hits}/${total} fields (${((hits / total) * 100).toFixed(0)}%) in ${Date.now() - t0}ms\n`);
  }
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) main();
