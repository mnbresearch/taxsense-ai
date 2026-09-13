/**
 * Batch 98 — document import: turn a pasted Form 16 (Part B) or AIS/TIS
 * summary into a partial TaxProfile the user can review before applying.
 *
 * DETERMINISTIC ON PURPOSE. No LLM in this path — every number is pulled by
 * an explicit, testable rule so the same input always yields the same output
 * and the user can trust what they see. The caller shows the extracted values
 * for confirmation; nothing is auto-committed to a return.
 */

export type ImportKind = "form16" | "ais";

export interface ImportField {
  path: string;        // dot-path into TaxProfile, e.g. "salary.grossSalary"
  label: string;
  value: number;       // rupees
  evidence: string;    // raw matched line, for verification
}

export interface ImportResult {
  kind: ImportKind;
  fields: ImportField[];
  notes: string[];
  recognised: boolean;
}

/** Parse an Indian-format amount: "12,34,567", "1234567.00", "Rs 45,000" -> number. */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[a-zA-Z₹\s]/g, "").replace(/,/g, "");
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function firstAmount(text: string, patterns: RegExp[]): { value: number; evidence: string } | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // Amounts sit at the end of the line; section refs like "10(13A)" or
      // "80CCD(1B)" appear before them. Take the LAST numeric token so a
      // section number is never mistaken for the amount.
      const seg = m[0] || "";
      const nums = seg.match(/\d[\d,]*(?:\.\d+)?/g) || [];
      for (let i = nums.length - 1; i >= 0; i--) {
        const amt = parseAmount(nums[i]);
        if (amt !== null && amt > 0) {
          return { value: amt, evidence: seg.replace(/\s+/g, " ").trim().slice(0, 160) };
        }
      }
    }
  }
  return null;
}

const A = String.raw`[^\n]*`;

export function parseForm16(text: string): ImportResult {
  const t = text.replace(/ /g, " ");
  const fields: ImportField[] = [];
  const notes: string[] = [];
  const push = (path: string, label: string, hit: { value: number; evidence: string } | null) => {
    if (hit) fields.push({ path, label, value: hit.value, evidence: hit.evidence });
  };

  push("salary.grossSalary", "Gross salary (sec 17(1))", firstAmount(t, [
    new RegExp(String.raw`gross\s+salary[^\d₹]*` + A, "i"),
    new RegExp(String.raw`salary\s+as\s+per\s+section\s+17\s*\(1\)[^\d₹]*` + A, "i"),
    new RegExp(String.raw`\b17\s*\(1\)[^\d₹]*` + A, "i"),
  ]));
  push("salary.professionalTax", "Professional tax (sec 16(iii))", firstAmount(t, [
    new RegExp(String.raw`professional\s+tax[^\d₹]*` + A, "i"),
    new RegExp(String.raw`tax\s+on\s+employment[^\d₹]*` + A, "i"),
  ]));
  push("salary.hraReceived", "HRA (sec 10(13A))", firstAmount(t, [
    new RegExp(String.raw`house\s+rent\s+allowance[^\d₹]*` + A, "i"),
    new RegExp(String.raw`10\s*\(13A\)[^\d₹]*` + A, "i"),
  ]));
  push("deductions.section80C", "80C (PF/LIC/ELSS)", firstAmount(t, [
    new RegExp(String.raw`80\s*CCE?\b[^\d₹]*` + A, "i"),
    new RegExp(String.raw`80C\b[^\d₹]*` + A, "i"),
  ]));
  push("deductions.section80CCD1B", "80CCD(1B) NPS", firstAmount(t, [
    new RegExp(String.raw`80\s*CCD\s*\(?1B\)?[^\d₹]*` + A, "i"),
  ]));
  push("deductions.section80D_selfFamily", "80D health insurance", firstAmount(t, [
    new RegExp(String.raw`80D\b[^\d₹]*` + A, "i"),
  ]));
  push("deductions.section80E", "80E education loan", firstAmount(t, [
    new RegExp(String.raw`80E\b[^\d₹]*` + A, "i"),
  ]));
  push("deductions.section80G", "80G donations", firstAmount(t, [
    new RegExp(String.raw`80G\b[^\d₹]*` + A, "i"),
  ]));

  const tds = firstAmount(t, [
    new RegExp(String.raw`total\s+tax\s+deducted[^\d₹]*` + A, "i"),
    new RegExp(String.raw`tax\s+deducted\s+at\s+source[^\d₹]*` + A, "i"),
    new RegExp(String.raw`\bTDS\b[^\d₹]*` + A, "i"),
  ]);
  if (tds) notes.push("TDS already deducted by employer: Rs " + tds.value.toLocaleString("en-IN") + " (carry into advance-tax as tax already paid).");

  const recognised = fields.length > 0 || /form\s*16|part\s*b|certificate\s+under\s+section\s+203/i.test(t);
  return { kind: "form16", fields, notes, recognised };
}

export function parseAIS(text: string): ImportResult {
  const t = text.replace(/ /g, " ");
  const fields: ImportField[] = [];
  const notes: string[] = [];
  const push = (path: string, label: string, hit: { value: number; evidence: string } | null) => {
    if (hit) fields.push({ path, label, value: hit.value, evidence: hit.evidence });
  };

  push("salary.grossSalary", "Salary received", firstAmount(t, [
    new RegExp(String.raw`salary\s*(?:received|\(reported\))?[^\d₹\n]*` + A, "i"),
  ]));
  push("otherSources.savingsInterest", "Savings-bank interest", firstAmount(t, [
    new RegExp(String.raw`interest\s+from\s+savings\s+bank[^\d₹\n]*` + A, "i"),
    new RegExp(String.raw`savings\s+account\s+interest[^\d₹\n]*` + A, "i"),
  ]));
  push("otherSources.fdInterest", "Deposit / term interest", firstAmount(t, [
    new RegExp(String.raw`interest\s+from\s+(?:deposit|term\s+deposit|fixed\s+deposit)[^\d₹\n]*` + A, "i"),
    new RegExp(String.raw`\bFD\s+interest\b[^\d₹\n]*` + A, "i"),
  ]));
  push("otherSources.dividends", "Dividend", firstAmount(t, [
    new RegExp(String.raw`dividend[^\d₹\n]*` + A, "i"),
  ]));
  push("capitalGains.ltcg112A", "LTCG equity/MF (112A)", firstAmount(t, [
    new RegExp(String.raw`long[\s-]*term\s+capital\s+gain[^\d₹\n]*` + A, "i"),
  ]));
  push("capitalGains.stcg111A", "STCG equity/MF (111A)", firstAmount(t, [
    new RegExp(String.raw`short[\s-]*term\s+capital\s+gain[^\d₹\n]*` + A, "i"),
  ]));

  const tds = firstAmount(t, [
    new RegExp(String.raw`(?:total\s+)?tax\s+deducted[^\d₹\n]*` + A, "i"),
    new RegExp(String.raw`\bTDS\b[^\d₹\n]*` + A, "i"),
  ]);
  if (tds) notes.push("TDS/TCS reported in AIS: Rs " + tds.value.toLocaleString("en-IN") + " - reconcile against Form 26AS before filing.");

  const recognised = fields.length > 0 || /annual\s+information\s+statement|taxpayer\s+information\s+summary|\bAIS\b|\bTIS\b/i.test(t);
  return { kind: "ais", fields, notes, recognised };
}

export function importDocument(text: string, kind?: ImportKind): ImportResult {
  const t = (text || "").slice(0, 200000);
  if (kind === "form16") return parseForm16(t);
  if (kind === "ais") return parseAIS(t);
  if (/annual\s+information\s+statement|taxpayer\s+information\s+summary|\bAIS\b|\bTIS\b/i.test(t)) return parseAIS(t);
  return parseForm16(t);
}

export function fieldsToPartialProfile(fields: ImportField[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const parts = f.path.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = f.value;
  }
  return out;
}
