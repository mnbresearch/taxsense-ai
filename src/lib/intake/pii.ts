/**
 * Keeps identity documents out of the LLM path (portfolio audit 2026-10-04).
 *
 * - redactPII: strips PAN, TAN, Aadhaar and long account numbers from any text
 *   before it can reach a third-party model.
 * - looksLikeDocument: detects a pasted Form 16 / AIS / TIS so the chat can
 *   parse it locally with the deterministic importer instead of sending it out.
 */

const PAN = /\b[A-Z]{3}[ABCFGHLJPTK][A-Z]\d{4}[A-Z]\b/gi;
const TAN = /\b[A-Z]{4}\d{5}[A-Z]\b/gi;
const AADHAAR = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
const ACCOUNT = /\b\d{11,18}\b/g; // bank account / long reference numbers

export function redactPII(text: string): string {
  return text
    .replace(PAN, "[PAN removed]")
    .replace(TAN, "[TAN removed]")
    .replace(AADHAAR, "[ID removed]")
    .replace(ACCOUNT, "[number removed]");
}

export function containsPII(text: string): boolean {
  return new RegExp(PAN.source, "i").test(text) || new RegExp(TAN.source, "i").test(text) || new RegExp(AADHAAR.source).test(text);
}

const DOC_MARKERS =
  /form\s*(no\.?\s*)?16|part\s*b\b|certificate\s+under\s+section\s+203|section\s+17\s*\(1\)|annual\s+information\s+statement|taxpayer\s+information\s+summary|\bTAN\s+of\s+(the\s+)?deductor|employer|deductor/i;

/** A long paste with document markers, or any paste carrying a PAN/TAN. */
export function looksLikeDocument(text: string): boolean {
  if (text.length >= 250 && DOC_MARKERS.test(text)) return true;
  if (text.length >= 120 && containsPII(text)) return true;
  return false;
}
