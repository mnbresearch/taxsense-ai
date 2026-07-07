/**
 * Filing-summary PDF generator (Session 4) — the product's "aha" moment.
 * Server-side, pdf-lib (no headless browser needed on Vercel).
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ComparisonResult, TaxProfile } from "../tax-engine";
import type { OptimizerReport } from "../optimizer";

const INK = rgb(0.13, 0.15, 0.19);
const MUTE = rgb(0.45, 0.48, 0.53);
const BRAND = rgb(0.05, 0.35, 0.28); // deep green
const ACCENT = rgb(0.93, 0.96, 0.94);
const LINE = rgb(0.85, 0.87, 0.89);
const WARN = rgb(0.65, 0.35, 0.05);

const A4: [number, number] = [595.28, 841.89];
const M = 48; // margin

// pdf-lib's WinAnsi fonts can't encode ₹ — use "Rs." everywhere and
// sanitise every string that reaches drawText (labels/estimates may carry ₹).
const inr = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
const winAnsi = (s: string) =>
  s
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[—–]/g, "-")
    .replace(/[≈]/g, "~")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[^\x20-\x7E -ÿ]/g, "");

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
}

async function newCtx(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  return { doc, page, y: A4[1] - M, font, bold };
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < M + 30) {
    ctx.page = ctx.doc.addPage(A4);
    ctx.y = A4[1] - M;
  }
}

function text(ctx: Ctx, s: string, opts: { size?: number; bold?: boolean; color?: any; x?: number; dy?: number } = {}) {
  const size = opts.size ?? 10;
  ensure(ctx, size + 4);
  ctx.page.drawText(winAnsi(s), {
    x: opts.x ?? M,
    y: ctx.y,
    size,
    font: opts.bold ? ctx.bold : ctx.font,
    color: opts.color ?? INK,
  });
  ctx.y -= size + (opts.dy ?? 6);
}

function row(ctx: Ctx, label: string, value: string, opts: { bold?: boolean; indent?: number; color?: any } = {}) {
  const size = 10;
  ensure(ctx, 16);
  const f = opts.bold ? ctx.bold : ctx.font;
  ctx.page.drawText(winAnsi(label), { x: M + (opts.indent ?? 0), y: ctx.y, size, font: f, color: opts.color ?? INK });
  const w = f.widthOfTextAtSize(winAnsi(value), size);
  ctx.page.drawText(winAnsi(value), { x: A4[0] - M - w, y: ctx.y, size, font: f, color: opts.color ?? INK });
  ctx.y -= 16;
}

function hr(ctx: Ctx) {
  ensure(ctx, 10);
  ctx.page.drawLine({
    start: { x: M, y: ctx.y + 4 },
    end: { x: A4[0] - M, y: ctx.y + 4 },
    thickness: 0.7,
    color: LINE,
  });
  ctx.y -= 10;
}

function sectionTitle(ctx: Ctx, s: string) {
  ensure(ctx, 34);
  ctx.y -= 8;
  ctx.page.drawRectangle({ x: M - 6, y: ctx.y - 4, width: 3, height: 14, color: BRAND });
  text(ctx, s.toUpperCase(), { size: 11, bold: true, color: BRAND, dy: 10 });
}

export interface FilingSummaryInput {
  profile: TaxProfile;
  comparison: ComparisonResult;
  optimizer: OptimizerReport;
  estimates?: string[];
  generatedFor?: string;
  /** v2 sections (optional — computed by the API route). */
  advanceTax?: {
    applicable: boolean;
    reason: string;
    installments: { label: string; dueDate: string; cumulativePct: number; installmentAmount: number }[];
    interest234C_ifAllMissed: number;
  };
  itr?: { form: string; formName: string; reasons: string[] };
  insights?: { kind: string; headline: string; detail: string }[];
}

export async function generateFilingSummaryPdf(input: FilingSummaryInput): Promise<Uint8Array> {
  const { profile, comparison, optimizer } = input;
  const ctx = await newCtx();
  const best = comparison[comparison.recommended];

  /* Header band */
  ctx.page.drawRectangle({ x: 0, y: A4[1] - 110, width: A4[0], height: 110, color: BRAND });
  ctx.page.drawText("TaxSense AI", { x: M, y: A4[1] - 52, size: 22, font: ctx.bold, color: rgb(1, 1, 1) });
  ctx.page.drawText("Income Tax Filing Summary — FY 2025-26 (AY 2026-27)", {
    x: M, y: A4[1] - 74, size: 11, font: ctx.font, color: rgb(0.85, 0.93, 0.9),
  });
  ctx.page.drawText(
    `Prepared for ${input.generatedFor ?? profile.name ?? "you"} on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
    { x: M, y: A4[1] - 92, size: 9, font: ctx.font, color: rgb(0.8, 0.88, 0.85) }
  );
  ctx.y = A4[1] - 140;

  /* Verdict card */
  ensure(ctx, 90);
  ctx.page.drawRectangle({ x: M - 10, y: ctx.y - 64, width: A4[0] - 2 * M + 20, height: 78, color: ACCENT });
  text(ctx, `RECOMMENDED: ${comparison.recommended.toUpperCase()} REGIME`, { size: 13, bold: true, color: BRAND, dy: 8 });
  text(
    ctx,
    comparison.savings > 0
      ? `Saves ${inr(comparison.savings)} versus the ${comparison.recommended === "new" ? "old" : "new"} regime.`
      : "Both regimes produce the same liability; the new regime means simpler paperwork.",
    { size: 10, dy: 6 }
  );
  text(ctx, `Total tax payable: ${inr(best.totalTaxLiability)}   |   Effective rate: ${best.effectiveRatePct}%   |   ${best.netPayable >= 0 ? "Balance payable" : "Refund due"}: ${inr(Math.abs(best.netPayable))}`, {
    size: 10, bold: true, dy: 14,
  });

  /* Income breakdown */
  sectionTitle(ctx, "Income breakdown");
  const h = best.heads;
  if (h.salary) row(ctx, "Salary (after exemptions & standard deduction)", inr(h.salary));
  if (best.salaryExemptions.hraExempt) row(ctx, "   of which HRA exemption applied", "- " + inr(best.salaryExemptions.hraExempt), { color: MUTE });
  if (h.houseProperty !== 0) row(ctx, "House property", inr(h.houseProperty));
  if (h.capitalGains) row(ctx, "Capital gains", inr(h.capitalGains));
  if (h.business) row(ctx, "Business / professional income", inr(h.business));
  if (h.otherSources) row(ctx, "Other sources (interest, dividends…)", inr(h.otherSources));
  hr(ctx);
  row(ctx, "Gross total income", inr(best.grossTotalIncome), { bold: true });

  /* Deductions */
  sectionTitle(ctx, "Deductions claimed");
  const entries = Object.entries(best.deductionsAllowed).filter(([, v]) => v > 0);
  if (entries.length === 0) text(ctx, comparison.recommended === "new" ? "New regime — Chapter VI-A deductions (other than employer NPS) do not apply." : "None claimed.", { color: MUTE });
  for (const [k, v] of entries) row(ctx, `Section ${k}`, inr(v));
  hr(ctx);
  row(ctx, "Total income (taxable)", inr(best.totalIncome), { bold: true });

  /* Both-regime computation table */
  sectionTitle(ctx, "Tax computed under both regimes");
  const colX = [M, 330, 460];
  const header = ["", "Old regime", "New regime"];
  ensure(ctx, 20);
  header.forEach((s, i) => ctx.page.drawText(s, { x: colX[i], y: ctx.y, size: 10, font: ctx.bold, color: MUTE }));
  ctx.y -= 16;
  const lines: [string, number, number][] = [
    ["Taxable income", comparison.old.totalIncome, comparison.new.totalIncome],
    ["Tax on slab income", comparison.old.taxOnNormalIncome, comparison.new.taxOnNormalIncome],
    ["Tax on capital gains (special rates)", specialTotal(comparison.old), specialTotal(comparison.new)],
    ["Rebate u/s 87A (incl. marginal relief)", -(comparison.old.rebate87A + comparison.old.rebateMarginalRelief), -(comparison.new.rebate87A + comparison.new.rebateMarginalRelief)],
    ["Surcharge (net of marginal relief)", comparison.old.surcharge - comparison.old.surchargeMarginalRelief, comparison.new.surcharge - comparison.new.surchargeMarginalRelief],
    ["Health & education cess (4%)", comparison.old.cess, comparison.new.cess],
  ];
  for (const [label, o, n] of lines) {
    ensure(ctx, 16);
    ctx.page.drawText(label, { x: colX[0], y: ctx.y, size: 9.5, font: ctx.font, color: INK });
    ctx.page.drawText(inr(o), { x: colX[1], y: ctx.y, size: 9.5, font: ctx.font, color: INK });
    ctx.page.drawText(inr(n), { x: colX[2], y: ctx.y, size: 9.5, font: ctx.font, color: INK });
    ctx.y -= 15;
  }
  hr(ctx);
  ensure(ctx, 18);
  ctx.page.drawText("TOTAL LIABILITY", { x: colX[0], y: ctx.y, size: 10.5, font: ctx.bold, color: INK });
  ctx.page.drawText(inr(comparison.old.totalTaxLiability), { x: colX[1], y: ctx.y, size: 10.5, font: ctx.bold, color: comparison.recommended === "old" ? BRAND : INK });
  ctx.page.drawText(inr(comparison.new.totalTaxLiability), { x: colX[2], y: ctx.y, size: 10.5, font: ctx.bold, color: comparison.recommended === "new" ? BRAND : INK });
  ctx.y -= 24;

  /* Optimizer suggestions */
  if (optimizer.suggestions.length > 0) {
    sectionTitle(ctx, "Moves that would lower your tax");
    for (const s of optimizer.suggestions.slice(0, 5)) {
      row(ctx, `• ${s.label}`, `saves ${inr(s.taxSaved)}`);
    }
  }

  /* v2 — Which ITR form */
  if (input.itr) {
    sectionTitle(ctx, "Which ITR form to file");
    row(ctx, `${input.itr.form} (${input.itr.formName})`, "", { bold: true });
    for (const r of input.itr.reasons.slice(0, 3)) text(ctx, `- ${r}`, { size: 9, color: MUTE, dy: 4 });
  }

  /* v2 — Advance-tax calendar */
  if (input.advanceTax) {
    sectionTitle(ctx, "Advance-tax calendar (s.211)");
    if (!input.advanceTax.applicable) {
      text(ctx, input.advanceTax.reason, { size: 9.5, color: MUTE });
    } else {
      for (const inst of input.advanceTax.installments) {
        const dt = new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        row(ctx, `${dt} — ${inst.cumulativePct}% cumulative`, inr(inst.installmentAmount));
      }
      text(
        ctx,
        `Skipping the calendar entirely would cost about ${inr(input.advanceTax.interest234C_ifAllMissed)} in s.234C interest.`,
        { size: 9, color: WARN, dy: 6 }
      );
    }
  }

  /* v2 — Smart insights */
  if (input.insights?.length) {
    sectionTitle(ctx, "Smart insights");
    for (const ins of input.insights.slice(0, 3)) {
      text(ctx, ins.headline, { size: 10, bold: true, dy: 3 });
      text(ctx, ins.detail, { size: 8.5, color: MUTE, dy: 8 });
    }
  }

  /* Audit notes */
  const notes = [...new Set([...comparison.old.notes, ...comparison.new.notes])];
  if (notes.length) {
    sectionTitle(ctx, "How this was computed (audit notes)");
    for (const n of notes.slice(0, 10)) text(ctx, `- ${n}`, { size: 8.5, color: MUTE, dy: 4 });
  }
  if (input.estimates?.length) {
    text(ctx, "Estimated figures to verify before filing:", { size: 9, bold: true, color: WARN, dy: 4 });
    for (const e of input.estimates.slice(0, 6)) text(ctx, `- ${e}`, { size: 8.5, color: WARN, dy: 4 });
  }

  /* Document checklist */
  sectionTitle(ctx, "Documents you'll need to file");
  for (const d of documentChecklist(profile)) text(ctx, `[  ] ${d}`, { size: 9.5, dy: 5 });

  /* Footer on each page */
  const pages = ctx.doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `TaxSense AI · Computed under the Income-tax Act, 1961 as amended by Finance Act 2025 · Not a substitute for professional advice · Page ${i + 1}/${pages.length}`,
      { x: M, y: 28, size: 7.5, font: ctx.font, color: MUTE }
    );
  });

  return ctx.doc.save();
}

function specialTotal(r: ComparisonResult["old"]): number {
  return r.specialRateTax.stcg111A.tax + r.specialRateTax.ltcg112A.tax + r.specialRateTax.ltcgOther.tax;
}

export function documentChecklist(p: TaxProfile): string[] {
  const docs: string[] = ["PAN & Aadhaar (linked)", "Form 26AS / AIS / TIS from the income-tax portal"];
  if (p.salary?.grossSalary) docs.push("Form 16 from your employer (Parts A & B)");
  if (p.salary?.rentPaid) docs.push("Rent receipts / rental agreement (landlord PAN if rent > Rs. 1L/yr)");
  if (p.houseProperties.length) docs.push("Home-loan interest certificate (Form from lender)", "Municipal-tax receipts");
  if (p.capitalGains) docs.push("Broker capital-gains statement (P&L with holding periods)", "Demat transaction statement");
  if (p.business?.netIncome) docs.push(p.business.presumptive ? "Gross-receipts summary (44AD/44ADA)" : "P&L, balance sheet & books of account");
  if (p.otherSources?.fdInterest || p.otherSources?.savingsInterest) docs.push("Bank interest certificates / Form 16A");
  if (p.deductions.section80C) docs.push("80C proofs: PF statement, PPF passbook, ELSS/LIC receipts, tuition receipts");
  if (p.deductions.section80D_selfFamily || p.deductions.section80D_parents) docs.push("Health-insurance premium receipts (80D)");
  if (p.deductions.section80E) docs.push("Education-loan interest certificate (80E)");
  if (p.deductions.section80G) docs.push("Donation receipts with 80G registration number");
  docs.push("Bank account details (pre-validated on the e-filing portal for refund)");
  return docs;
}
