/**
 * Batch 41 — Form 26AS / AIS text reconciliation. Deterministic parser:
 * paste the copied text of a 26AS statement and it extracts TDS entries
 * (section, deductor, amount), totals them and reconciles against the
 * client's own numbers. Nothing leaves the browser.
 */
export interface TdsEntry {
  section: string;
  deductor: string;
  amount: number;
}

export interface TdsParseResult {
  entries: TdsEntry[];
  total: number;
  bySection: Record<string, number>;
  lines: number;
}

const SECTION_RE = /\b(192A?|193|194[A-Z]{0,2}(?:-?I[AB]?)?|195|206C[A-Z]*)\b/;
/** ₹ amounts with Indian or plain grouping, with optional decimals. */
const AMOUNT_RE = /(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g;

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/**
 * Heuristics tuned for 26AS text dumps: a line (or wrapped line pair)
 * mentioning a TDS section + a deductor-ish name + amounts. The LAST
 * amount on the line is treated as the tax deducted (26AS column order:
 * amount paid/credited … tax deducted … tax deposited).
 */
export function parse26AS(text: string): TdsParseResult {
  const entries: TdsEntry[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const secMatch = SECTION_RE.exec(line);
    if (!secMatch) continue;
    const amounts = [...line.matchAll(AMOUNT_RE)]
      .map((m) => toNumber(m[1]))
      .filter((n) => Number.isFinite(n) && n > 0);
    // drop numbers that are clearly not money (years, section echoes)
    const money = amounts.filter((n) => n >= 100 && n !== toNumber(secMatch[1].replace(/\D/g, "") || "0"));
    if (money.length === 0) continue;
    const amount = money[money.length - 1];
    // deductor: text before the section token, minus dates/TAN-ish tokens
    const deductor = line
      .slice(0, secMatch.index)
      .replace(/\b[A-Z]{4}[0-9]{5}[A-Z]\b/g, "") // TAN
      .replace(/\d{2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4}/g, "") // dates
      .replace(/[^A-Za-z&().\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    entries.push({ section: secMatch[1].toUpperCase(), deductor: deductor || "Unknown deductor", amount });
  }

  // de-dupe exact repeats (26AS often repeats rows across quarters' pages)
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const k = `${e.section}|${e.deductor}|${e.amount}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const bySection: Record<string, number> = {};
  for (const e of deduped) bySection[e.section] = (bySection[e.section] ?? 0) + e.amount;
  const total = deduped.reduce((a, e) => a + e.amount, 0);
  return { entries: deduped, total, bySection, lines: lines.length };
}

export interface Reconciliation {
  tdsTotal: number;
  claimed: number;
  difference: number;
  verdict: "match" | "claim-more" | "claim-less";
}

/** Compare parsed 26AS credits with what the client plans to claim in the return. */
export function reconcile(parsed: TdsParseResult, claimedTds: number): Reconciliation {
  const diff = parsed.total - claimedTds;
  return {
    tdsTotal: parsed.total,
    claimed: claimedTds,
    difference: diff,
    verdict: Math.abs(diff) < 10 ? "match" : diff > 0 ? "claim-more" : "claim-less",
  };
}
