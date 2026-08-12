/**
 * Batch 76 — the Filing Kit: what a CA hands you before filing.
 *
 * Three deterministic products from one profile + computation:
 *  1. documents — a personalized checklist of exactly the papers THIS
 *     profile needs (nothing generic, nothing missing);
 *  2. redFlags — the scrutiny-risk radar: the mismatches and patterns that
 *     actually trigger 143(1) adjustments and notices, each with a fix;
 *  3. steps — a portal-accurate e-filing walkthrough for the recommended
 *     ITR form, regime election (10-IEA) included.
 *
 * Pure functions, no I/O — safe to run client-side.
 */
import type { ComparisonResult, TaxProfile } from "./tax-engine/types";
import type { ItrRecommendation } from "./tax-engine/itrForm";

export interface DocItem { label: string; why: string }
export interface DocGroup { group: string; icon: string; items: DocItem[] }
export type FlagSeverity = "high" | "medium" | "info";
export interface RedFlag { severity: FlagSeverity; title: string; detail: string; fix: string }
export interface FilingStep { title: string; detail: string }
export interface FilingKit { documents: DocGroup[]; redFlags: RedFlag[]; steps: FilingStep[] }

/** FY 2025-26 (AY 2026-27) key dates. */
export const DUE_DATE_NON_AUDIT = new Date("2026-07-31T23:59:59+05:30");
export const BELATED_DEADLINE = new Date("2026-12-31T23:59:59+05:30");

const inr = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");

export function buildFilingKit(
  profile: TaxProfile,
  cmp: ComparisonResult,
  itr: ItrRecommendation,
  today: Date = new Date()
): FilingKit {
  const best = cmp[cmp.recommended];
  const s = profile.salary;
  const cg = profile.capitalGains;
  const biz = profile.business;
  const os = profile.otherSources;
  const d = profile.deductions;

  /* ------------------------------ documents ------------------------------ */
  const documents: DocGroup[] = [];
  documents.push({
    group: "Identity & portal basics", icon: "🪪",
    items: [
      { label: "PAN linked with Aadhaar", why: "Unlinked PANs are inoperative — the return won't process." },
      { label: "Bank account pre-validated on the portal", why: "Refunds are credited only to a pre-validated account." },
      { label: "Form 26AS (portal → e-File → View 26AS)", why: "The department's record of every TDS credit against your PAN." },
      { label: "AIS / TIS download", why: "What the department already knows — interest, dividends, securities trades. Your return must not contradict it." },
    ],
  });
  if (s?.grossSalary) {
    const items: DocItem[] = [
      { label: "Form 16 (Parts A & B) from every employer this year", why: "Part B is the authoritative salary break-up; multiple employers must all be included." },
    ];
    if (s.rentPaid > 0) {
      items.push({ label: "Rent receipts for the full year", why: "HRA exemption claims are the most commonly disallowed item without proof." });
      if (s.rentPaid > 100000)
        items.push({ label: "Landlord's PAN", why: "Mandatory when annual rent exceeds ₹1,00,000 (Rule 26C declaration)." });
    }
    if (s.employerNpsContribution > 0)
      items.push({ label: "NPS statement showing employer contribution", why: "Backs the 80CCD(2) deduction — allowed in both regimes." });
    documents.push({ group: "Salary", icon: "💼", items });
  }
  if (profile.houseProperties.length > 0) {
    const items: DocItem[] = [];
    if (profile.houseProperties.some((h) => h.homeLoanInterest > 0))
      items.push({ label: "Home-loan interest certificate from the lender", why: "States the exact s.24(b) interest for the year — the portal asks for lender details." });
    if (profile.houseProperties.some((h) => h.municipalTaxes > 0))
      items.push({ label: "Municipal tax payment receipts", why: "Deductible only if actually PAID during the year, by the owner." });
    if (profile.houseProperties.some((h) => h.use === "let-out"))
      items.push({ label: "Rent agreement + rent received summary", why: "Gross annual value must reconcile with what your tenant reported, if TDS was deducted on rent." });
    if (items.length) documents.push({ group: "House property", icon: "🏠", items });
  }
  if (cg && (cg.stcg111A > 0 || cg.stcgOther > 0 || cg.ltcg112A > 0 || cg.ltcgOther > 0)) {
    const items: DocItem[] = [
      { label: "Broker capital-gains statement (P&L, scrip-wise)", why: "Schedule CG asks for scrip-wise details of 112A sales — brokers export this ready-made." },
    ];
    if (cg.ltcgOther > 0)
      items.push({ label: "Sale + purchase deeds for property/gold/unlisted assets", why: "Dates decide the holding period; values decide the s.112 gain. Registry values are cross-checked." });
    documents.push({ group: "Capital gains", icon: "📈", items });
  }
  if (biz?.netIncome) {
    documents.push({
      group: "Business / profession", icon: "🧑‍💻",
      items: biz.presumptive
        ? [
            { label: "Gross receipts / turnover summary", why: "44AD/44ADA declare income as a % of gross receipts — the gross figure goes in the return." },
            { label: "Full-year bank statements", why: "Receipts through banking channels get the lower 6% presumption under 44AD." },
          ]
        : [
            { label: "Books of account: P&L, balance sheet, ledgers", why: "ITR-3 requires financial-statement level disclosure." },
            { label: "GST returns (if registered)", why: "Turnover is cross-matched between GST and income-tax systems." },
          ],
    });
  }
  {
    const items: DocItem[] = [];
    if ((os?.savingsInterest ?? 0) + (os?.fdInterest ?? 0) > 0)
      items.push({ label: "Bank interest certificates", why: "Banks deduct TDS at 10% only above thresholds — the full interest is still taxable." });
    if ((os?.dividends ?? 0) > 0)
      items.push({ label: "Dividend statement (broker/AIS)", why: "Dividends are taxed at slab since FY 20-21; AIS lists every credit." });
    if (items.length) documents.push({ group: "Other income", icon: "🏦", items });
  }
  {
    const items: DocItem[] = [];
    if (d.section80C > 0) items.push({ label: "80C proofs: PPF passbook / ELSS statement / LIC receipts / tuition receipts", why: "CPC matches your claim against employer Form 16; keep proofs 8 years." });
    if (d.section80CCD1B > 0) items.push({ label: "NPS Tier-I contribution statement", why: "Backs the extra ₹50,000 u/s 80CCD(1B)." });
    if (d.section80D_selfFamily + d.section80D_parents > 0) items.push({ label: "Health-insurance premium receipts", why: "Must be paid by any mode OTHER than cash (preventive check-ups excepted)." });
    if (d.section80E > 0) items.push({ label: "Education-loan interest certificate", why: "80E has no cap but needs the lender's interest split." });
    if (d.section80G > 0) items.push({ label: "Donation receipts with the donee's 80G registration + your Form 10BE", why: "Since FY 21-22, 80G claims must match the donee's filed statement (Form 10BD/10BE)." });
    if (items.length) documents.push({ group: "Deduction proofs", icon: "🧾", items });
  }

  /* ------------------------------ red flags ------------------------------ */
  const redFlags: RedFlag[] = [];
  if (today > DUE_DATE_NON_AUDIT) {
    const feeSmall = best.totalIncome <= 500000;
    redFlags.push({
      severity: "high",
      title: "Past the 31 July due date — this is now a belated return",
      detail: `File u/s 139(4) by 31 December 2026. Late fee u/s 234F: ${feeSmall ? "₹1,000 (income ≤ ₹5L)" : "₹5,000"}; interest u/s 234A runs on unpaid tax, and most losses can no longer be carried forward.`,
      fix: "File as soon as possible — every month of delay adds 1% interest u/s 234A on the balance.",
    });
  }
  if (best.taxesPaid === 0 && best.totalTaxLiability > 10000) {
    redFlags.push({
      severity: "high",
      title: `${inr(best.totalTaxLiability)} liability with zero tax paid so far`,
      detail: "Advance-tax was due in four instalments; interest u/s 234B (1%/month) and 234C is accruing on the full amount.",
      fix: "Pay self-assessment tax (challan 280) BEFORE submitting the return so it files clean.",
    });
  }
  if (best.netPayable < -50000) {
    redFlags.push({
      severity: "medium",
      title: `Large refund claimed (${inr(best.netPayable)})`,
      detail: "High-refund returns get automated TDS-credit scrutiny. If any employer/bank misreported, the refund stalls.",
      fix: "Tick off every TDS entry in Form 26AS against your Form 16 and interest certificates before filing.",
    });
  }
  if (s && s.rentPaid > 100000) {
    redFlags.push({
      severity: "medium",
      title: "Rent above ₹1L/year — landlord PAN is mandatory",
      detail: "Without the landlord's PAN, employers must restrict the HRA exemption; CPC cross-checks large HRA claims against rent TDS data.",
      fix: "Collect the landlord's PAN (or a no-PAN declaration) and keep rent receipts for every month.",
    });
  }
  const interestIncome = (os?.savingsInterest ?? 0) + (os?.fdInterest ?? 0) + (os?.dividends ?? 0);
  if (interestIncome === 0) {
    redFlags.push({
      severity: "medium",
      title: "No interest or dividend income declared",
      detail: "AIS almost always shows savings-account interest, and any FD or stock holding adds more. An AIS↔return mismatch is the single most common cause of 143(1) adjustment notices.",
      fix: "Open your AIS before filing and add every interest/dividend line — 80TTA exempts up to ₹10,000 of savings interest (old regime) anyway.",
    });
  }
  if (d.section80C >= 150000) {
    redFlags.push({
      severity: "info",
      title: "80C claimed at the ₹1.5L cap",
      detail: "Perfectly legal and very common — which is why CPC matches it against your employer's Form 16 figures.",
      fix: "If part of the claim isn't in Form 16 (e.g., PPF paid personally), keep the passbook entry ready.",
    });
  }
  const hpOld = cmp.old.heads.houseProperty;
  if (hpOld <= -200000) {
    redFlags.push({
      severity: "info",
      title: "House-property loss hits the ₹2L set-off cap",
      detail: "Only ₹2,00,000 of HP loss can be set off against other income in a year; the excess carries forward 8 years — but ONLY if you file by the due date (belated returns lose it).",
      fix: "Check the loss schedule (CFL) is filled so the carry-forward is on record.",
    });
  }
  if (biz && cmp.recommended === "old") {
    redFlags.push({
      severity: "medium",
      title: "Old regime + business income needs Form 10-IEA first",
      detail: "Since AY 24-25 the new regime is the default. With business/professional income, opting OUT requires filing Form 10-IEA before the return — and the choice is near-permanent (one switch-back allowed).",
      fix: "File Form 10-IEA on the portal, note the acknowledgement number, then start the return.",
    });
  }

  /* -------------------------------- steps -------------------------------- */
  const regimeLabel = cmp.recommended === "new" ? "New" : "Old";
  const schedules: string[] = [];
  if (s?.grossSalary) schedules.push("Salary");
  if (profile.houseProperties.length) schedules.push("House Property");
  if (cg && (cg.stcg111A || cg.stcgOther || cg.ltcg112A || cg.ltcgOther)) schedules.push("Capital Gains (scrip-wise for 112A)");
  if (biz?.netIncome) schedules.push(biz.presumptive ? "44AD/44ADA presumptive" : "P&L + Balance Sheet");
  if (interestIncome > 0 || os?.familyPension || os?.other) schedules.push("Other Sources");
  schedules.push("Chapter VI-A deductions");

  const steps: FilingStep[] = [
    { title: "Reconcile before you type anything", detail: "Download AIS + 26AS and tick every TDS line against Form 16 / interest certificates. Fix mismatches at the source (employer/bank) — not by ignoring them." },
    ...(biz && cmp.recommended === "old"
      ? [{ title: "File Form 10-IEA (old-regime election)", detail: "Portal → e-File → Income Tax Forms → 10-IEA. Needed BEFORE the return because you have business income and the old regime wins for you." }]
      : []),
    { title: `Start the return — ${itr.form}`, detail: `incometax.gov.in → e-File → Income Tax Returns → File → AY 2026-27 → Online → ${itr.form} (${itr.formName}). ${itr.reasons[0] ?? ""}` },
    { title: "Verify the prefill, don't trust it", detail: "The portal prefills salary, TDS and interest from AIS. Check every figure against your documents — prefill errors are yours once submitted." },
    { title: `Fill these schedules: ${schedules.join(" · ")}`, detail: "Everything else can stay untouched. TaxSense's filing-summary PDF mirrors these numbers field-by-field." },
    { title: `Pick the ${regimeLabel} regime`, detail: cmp.recommended === "new" ? "New regime is the portal default — just confirm it. Your computed saving vs old: " + inr(cmp.savings) + "." : "Choose 'opting out of new regime' in the return" + (biz ? " (your 10-IEA acknowledgement number goes here)" : "") + ". Your computed saving vs new: " + inr(cmp.savings) + "." },
    ...(best.netPayable > 0
      ? [{ title: `Pay the balance ${inr(best.netPayable)} first`, detail: "e-Pay Tax → challan 280 → self-assessment (300). Enter the BSR code + challan number in the return so it files with zero demand." }]
      : []),
    { title: "Submit, then e-verify within 30 days", detail: "Aadhaar OTP is instant. An un-verified return is treated as never filed." },
    { title: "Archive the kit", detail: "Save the filed ITR-V, the acknowledgement and every proof above for 8 years — reassessment windows reach back that far in big-escape cases." },
  ];

  return { documents, redFlags, steps };
}
