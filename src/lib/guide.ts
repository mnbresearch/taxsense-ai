/**
 * Tax Guide — deterministic knowledge engine (feature batch 6).
 *
 * A handful of tap-through answers → a personalised, education-first brief:
 * which scheme you can use (44AD / 44ADA), whether books & audit apply (44AB),
 * GST registration pointers, the right ITR form, advance-tax duties, deadlines
 * and the exact document list. No LLM anywhere — every line is a rule.
 *
 * FY 2025-26 figures. Sections cited so users can verify everything.
 */

export type EarnType = "salaried" | "professional" | "business" | "rental" | "investor";

export interface GuideAnswers {
  /** All the ways this person earns (multi-select). */
  earns: EarnType[];
  /** Business turnover band (only if business). */
  turnoverBand?: "upto2cr" | "2to3cr" | "3to10cr" | "above10cr";
  /** Professional gross receipts band (only if professional). */
  receiptsBand?: "upto50L" | "50to75L" | "above75L";
  /** Are ≥95% of receipts AND payments digital (bank/UPI/cheque)? */
  mostlyDigital?: boolean;
  /** Entity type for the business/profession. */
  entity?: "individual" | "partnership" | "llp" | "company";
  /** Sells goods vs services (GST thresholds differ). */
  sellsGoods?: boolean;
  /** Did they sell shares/MF/property this year? */
  soldAssets?: boolean;
  /** Total annual income band (for regime/rebate framing). */
  incomeBand?: "upto12L" | "12to50L" | "above50L";
}

export interface GuideSection {
  title: string;
  tone: "good" | "warn" | "info";
  points: string[];
}

export interface GuideReport {
  headline: string;
  itrForm: string;
  sections: GuideSection[];
  documents: string[];
  deadlines: { date: string; what: string }[];
}

const has = (a: GuideAnswers, t: EarnType) => a.earns.includes(t);

export function buildGuide(a: GuideAnswers): GuideReport {
  const sections: GuideSection[] = [];
  const documents = new Set<string>(["PAN & Aadhaar (linked)", "Form 26AS / AIS from incometax.gov.in"]);
  const isBiz = has(a, "business");
  const isProf = has(a, "professional");
  const entity = a.entity ?? "individual";

  /* ---------- presumptive taxation ---------- */
  let presumptiveOk = false;
  if (isBiz) {
    const eligibleEntity = entity === "individual" || entity === "partnership";
    const withinLimit =
      a.turnoverBand === "upto2cr" || (a.turnoverBand === "2to3cr" && a.mostlyDigital === true);
    if (!eligibleEntity) {
      sections.push({
        title: "Presumptive scheme (44AD) — not available to your entity",
        tone: "warn",
        points: [
          entity === "llp"
            ? "LLPs are expressly excluded from s.44AD — you'll maintain regular books of account."
            : "Companies file under the Companies Act framework with full books and statutory audit — presumptive schemes don't apply.",
          "Your taxable business income = revenue − allowable expenses, computed from books.",
        ],
      });
    } else if (withinLimit) {
      presumptiveOk = true;
      sections.push({
        title: "You can likely use presumptive taxation — s.44AD",
        tone: "good",
        points: [
          a.turnoverBand === "2to3cr"
            ? "Turnover between ₹2–3 crore qualifies ONLY because ≥95% of your receipts are digital (the enhanced ₹3cr limit, Finance Act 2023)."
            : "Turnover up to ₹2 crore qualifies (up to ₹3 crore if ≥95% of receipts are digital).",
          "Declare 6% of digital turnover (8% of cash turnover) as profit — no books of account, no audit, no expense proofs.",
          "You may declare HIGHER than 6/8% if your real profit is higher — you must not declare lower without books + audit.",
          "Commitment rule: opt out later and you're barred from 44AD for the next 5 years — plan before switching.",
          "Advance tax is ONE installment: 100% by 15 March (not four quarterly payments).",
        ],
      });
    } else {
      sections.push({
        title: "Presumptive (44AD) is out of reach — regular books it is",
        tone: "warn",
        points: [
          "Your turnover exceeds the 44AD ceiling (₹2cr, or ₹3cr with ≥95% digital receipts).",
          "You'll compute income from proper books: revenue − allowable business expenses (rent, salaries, depreciation u/s 32, interest…).",
        ],
      });
    }
  }
  if (isProf) {
    const withinLimit =
      a.receiptsBand === "upto50L" || (a.receiptsBand === "50to75L" && a.mostlyDigital === true);
    if (withinLimit && (entity === "individual" || entity === "partnership")) {
      presumptiveOk = true;
      sections.push({
        title: "You can likely use presumptive taxation — s.44ADA",
        tone: "good",
        points: [
          a.receiptsBand === "50to75L"
            ? "Receipts between ₹50–75 lakh qualify ONLY because ≥95% are digital (enhanced limit, Finance Act 2023)."
            : "Gross receipts up to ₹50 lakh qualify (₹75L if ≥95% digital).",
          "Declare 50% of gross receipts as profit — no books, no audit. If your true costs are lower than 50%, this is a genuine saving.",
          "Applies to 'specified professions': legal, medical, engineering, architecture, accountancy, technical consultancy, interior decoration, and notified professions (most software consultants fit 'technical consultancy').",
          "Advance tax: single installment, 100% by 15 March.",
        ],
      });
    } else if (a.receiptsBand) {
      sections.push({
        title: "44ADA presumptive is out of reach",
        tone: "warn",
        points: [
          a.receiptsBand === "above75L"
            ? "Receipts above ₹75 lakh exceed the 44ADA ceiling regardless of digital share."
            : "Receipts between ₹50–75L need ≥95% digital collections to qualify — yours aren't, so regular books apply.",
          "Maintain books u/s 44AA and compute income as receipts − actual expenses.",
        ],
      });
    }
  }

  /* ---------- audit (44AB) ---------- */
  if (isBiz || isProf) {
    const auditPoints: string[] = [];
    let auditLikely = false;
    if (isBiz) {
      if (a.turnoverBand === "above10cr") {
        auditLikely = true;
        auditPoints.push("Business turnover above ₹10 crore → tax audit u/s 44AB is mandatory, full stop.");
      } else if (a.turnoverBand === "3to10cr" || a.turnoverBand === "2to3cr") {
        if (a.mostlyDigital) auditPoints.push("Turnover ₹1–10 crore with ≥95% digital receipts AND payments → NO tax audit (the enhanced 44AB(a) limit).");
        else { auditLikely = true; auditPoints.push("Turnover above ₹1 crore with significant cash dealings → tax audit u/s 44AB applies."); }
      } else if (!presumptiveOk && a.turnoverBand === "upto2cr") {
        auditPoints.push("Below ₹1 crore (or ₹10cr fully digital) → no audit, unless you claim profits BELOW the presumptive 6/8% while your income exceeds the basic exemption.");
      }
    }
    if (isProf && a.receiptsBand === "above75L") {
      auditLikely = true;
      auditPoints.push("Professional receipts above the audit threshold → 44AB audit by a CA before filing.");
    }
    if (presumptiveOk) auditPoints.push("Staying within the presumptive scheme keeps you fully audit-exempt — one of its biggest advantages.");
    if (auditPoints.length)
      sections.push({
        title: auditLikely ? "Tax audit (44AB) — applies to you" : "Tax audit (44AB) — where you stand",
        tone: auditLikely ? "warn" : "info",
        points: auditPoints,
      });
    if (auditLikely) documents.add("CA-signed tax-audit report (Form 3CB/3CD) — due before the audit-case filing deadline");
  }

  /* ---------- GST pointer ---------- */
  if (isBiz || isProf) {
    const th = a.sellsGoods ? "₹40 lakh (goods, most states)" : "₹20 lakh (services, most states)";
    sections.push({
      title: "GST registration — separate from income tax",
      tone: "info",
      points: [
        `Registration becomes mandatory once aggregate turnover crosses ${th}; special-category states have lower limits.`,
        "Selling on e-commerce platforms or across states can force registration regardless of turnover.",
        "GST returns (GSTR-1/3B) are an entirely separate compliance calendar from your income-tax return — don't conflate the two.",
      ],
    });
  }

  /* ---------- ITR form ---------- */
  let itrForm = "ITR-1 (Sahaj)";
  if (isBiz || isProf) itrForm = presumptiveOk ? "ITR-4 (Sugam)" : "ITR-3";
  else if (a.soldAssets || has(a, "rental") && a.incomeBand === "above50L") itrForm = "ITR-2";
  else if (a.soldAssets) itrForm = "ITR-2";
  else if (a.incomeBand === "above50L") itrForm = "ITR-2";
  if ((isBiz || isProf) && presumptiveOk && (a.incomeBand === "above50L" || a.soldAssets)) {
    itrForm = "ITR-3";
    sections.push({
      title: "Why ITR-3 and not Sugam",
      tone: "info",
      points: ["Presumptive income normally files ITR-4, but capital gains or total income above ₹50L pushes you to ITR-3 — same presumptive computation, bigger form."],
    });
  }

  /* ---------- regime framing ---------- */
  const regimePoints: string[] = [];
  if (a.incomeBand === "upto12L")
    regimePoints.push("Income up to ₹12L → the new regime's 87A rebate likely makes your tax ZERO — deduction-hunting is probably wasted effort. Verify in the calculator.");
  if (isBiz || isProf)
    regimePoints.push("The new regime is the DEFAULT now. Business/professional filers who want the old regime must file Form 10-IEA before the due date — and broadly get ONE switch back, so treat it as a long-term decision.");
  else regimePoints.push("Salaried filers can switch regimes every year at filing time — compute both, pick the cheaper, no lock-in.");
  regimePoints.push("TaxSense computes both regimes on your real numbers — use the chat when you're ready for exact figures.");
  sections.push({ title: "Old vs new regime — what applies to you", tone: "info", points: regimePoints });

  /* ---------- capital assets / rental ---------- */
  if (a.soldAssets) {
    sections.push({
      title: "You sold assets — capital-gains homework",
      tone: "info",
      points: [
        "Listed equity/equity MF: >12 months = LTCG at 12.5% above the ₹1.25L annual exemption; ≤12 months = STCG at 20%.",
        "Property/gold: 24-month line; LTCG at 12.5% (no indexation for post-Jul-2024 transfers).",
        "Pull your broker's capital-gains statement — holding-period splits matter more than totals.",
      ],
    });
    documents.add("Broker capital-gains statement (P&L with holding periods)");
  }
  if (has(a, "rental")) {
    sections.push({
      title: "Rental income — the 30% freebie",
      tone: "info",
      points: [
        "Taxable rent = (rent − municipal taxes) − a flat 30% standard deduction − full home-loan interest. Keep it in the return even if TDS was deducted by the tenant.",
        "Loss from let-out property can offset other income only up to ₹2L per year (old regime; not at all in the new).",
      ],
    });
    documents.add("Rent agreement + municipal-tax receipts + loan-interest certificate");
  }

  /* ---------- documents ---------- */
  if (has(a, "salaried")) documents.add("Form 16 from employer (Parts A & B)");
  if (isBiz || isProf) {
    documents.add(presumptiveOk ? "Turnover/gross-receipts summary (bank statements suffice under presumptive)" : "Books of account: ledger, P&L, balance sheet");
    documents.add("GST returns (if registered) — turnover must reconcile with the ITR");
  }
  documents.add("Bank account details, pre-validated on the e-filing portal (for refunds)");

  /* ---------- deadlines ---------- */
  const deadlines = [
    ...(isBiz || isProf
      ? presumptiveOk
        ? [{ date: "15 Mar 2026", what: "Advance tax — single 100% installment (presumptive privilege)" }]
        : [
            { date: "15 Jun / 15 Sep / 15 Dec 2025", what: "Advance-tax installments (15% / 45% / 75%)" },
            { date: "15 Mar 2026", what: "Final advance-tax installment (100%)" },
          ]
      : [{ date: "15 Mar 2026", what: "Advance tax if TDS falls short by ≥ ₹10,000" }]),
    { date: "31 Jul 2026", what: "ITR filing due date (non-audit cases) — s.234F late fee after this" },
  ];
  if (sections.some((s) => s.title.includes("44AB") && s.tone === "warn"))
    deadlines.push({ date: "31 Oct 2026", what: "Extended filing due date for audit cases (audit report earlier)" });

  const headline = isBiz
    ? presumptiveOk
      ? "Good news: you likely qualify for presumptive taxation — the simplest legal way to file a business return."
      : "You're in regular-books territory — heavier compliance, but every real expense becomes deductible."
    : isProf
      ? presumptiveOk
        ? "You likely qualify for 44ADA — declare 50% of receipts as profit and skip books entirely."
        : "Your practice has outgrown the presumptive shortcut — books and possibly audit now apply."
      : "Your filing is on the simpler end — here's exactly what applies and what doesn't.";

  return { headline, itrForm, sections, documents: [...documents], deadlines };
}
