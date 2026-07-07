/**
 * Curated tax glossary (feature batch 4).
 * "What is 87A?"-style questions are answered HERE — instantly, accurately,
 * at zero LLM cost — before the message ever reaches the extraction model.
 * Figures are FY 2025-26 and mirror src/lib/tax-engine/constants.ts.
 */

export interface GlossaryEntry {
  /** Match keys, lowercase. */
  keys: string[];
  term: string;
  answer: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    keys: ["87a", "rebate", "section 87a"],
    term: "Section 87A rebate",
    answer:
      "The rebate that makes small incomes tax-free. New regime (FY 2025-26): if your total income is ≤ ₹12,00,000, up to ₹60,000 of slab tax is wiped out — so up to ₹12.75L of salary is effectively tax-free after the ₹75k standard deduction. There's marginal relief just above ₹12L, and it never applies to special-rate capital gains. Old regime: ₹12,500 rebate if income ≤ ₹5,00,000.",
  },
  {
    keys: ["80c", "section 80c", "ppf", "elss"],
    term: "Section 80C",
    answer:
      "The classic ₹1,50,000 deduction basket — old regime only. It covers EPF, PPF, ELSS mutual funds, life-insurance premiums, home-loan principal, children's tuition, NSC and more, all sharing one ₹1.5L cap. In the new regime this deduction doesn't exist, which is exactly why the regime comparison matters.",
  },
  {
    keys: ["80d", "health insurance deduction", "mediclaim"],
    term: "Section 80D",
    answer:
      "Health-insurance premium deduction (old regime): up to ₹25,000 for self/spouse/children (₹50,000 if you're 60+), PLUS up to ₹25,000 for parents (₹50,000 if they're senior citizens). A family insuring senior parents can deduct up to ₹1,00,000 a year.",
  },
  {
    keys: ["80ccd", "nps", "80ccd(1b)", "80ccd(2)", "employer nps"],
    term: "NPS deductions (80CCD)",
    answer:
      "Three layers: 80CCD(1) — your own NPS inside the ₹1.5L 80C cap. 80CCD(1B) — an EXTRA ₹50,000 for self NPS, old regime only. 80CCD(2) — your employer's NPS contribution, deductible in BOTH regimes: up to 10% of basic+DA (old) or 14% (new). Employer NPS is the only big deduction that survives the new regime.",
  },
  {
    keys: ["hra", "house rent allowance", "rent exemption"],
    term: "HRA exemption",
    answer:
      "Old regime only. The exempt part of your House Rent Allowance is the LEAST of: (a) HRA actually received, (b) rent paid minus 10% of basic+DA, (c) 50% of basic+DA in a metro (Delhi/Mumbai/Kolkata/Chennai) or 40% elsewhere. High rent + high basic = big exemption — often the single biggest reason the old regime wins.",
  },
  {
    keys: ["111a", "stcg", "short term capital gain", "short-term"],
    term: "STCG — Section 111A",
    answer:
      "Short-term capital gains on listed equity/equity mutual funds (held ≤ 12 months, STT paid) are taxed at a flat 20% since 23-Jul-2024. No deductions can offset them, and the 87A rebate doesn't cover them in the new regime. Other short-term gains (debt, property) are taxed at your slab rate.",
  },
  {
    keys: ["112a", "ltcg", "long term capital gain", "long-term", "1.25 lakh exemption"],
    term: "LTCG — Section 112A",
    answer:
      "Long-term gains on listed equity/equity MF (held > 12 months): the first ₹1,25,000 each year is tax-free, the rest is taxed at 12.5% without indexation. Pro move: harvest gains up to the exemption every year (sell and rebuy) so the tax-free allowance never goes to waste — TaxSense flags your unused headroom automatically.",
  },
  {
    keys: ["advance tax", "installment", "instalment", "234c", "234b"],
    term: "Advance tax & interest (234B/234C)",
    answer:
      "If your tax after TDS is ≥ ₹10,000, you must pay in installments: 15% by 15 Jun, 45% by 15 Sep, 75% by 15 Dec, 100% by 15 Mar (presumptive taxpayers: everything by 15 Mar). Miss an installment and s.234C charges 1%/month on the shortfall; pay less than 90% by year-end and s.234B adds 1%/month from April. Resident seniors (60+) without business income are exempt. Check the Planner tab for your personal calendar.",
  },
  {
    keys: ["standard deduction"],
    term: "Standard deduction",
    answer:
      "A flat cut from salary/pension income, no proofs needed: ₹75,000 in the new regime, ₹50,000 in the old (FY 2025-26). It's automatic — TaxSense applies it before anything else.",
  },
  {
    keys: ["surcharge"],
    term: "Surcharge",
    answer:
      "An extra tax on the tax itself for high incomes: 10% above ₹50L, 15% above ₹1cr, 25% above ₹2cr, and 37% above ₹5cr (old regime; the new regime caps at 25%). Surcharge on equity capital-gains tax is capped at 15% regardless. Marginal relief stops a ₹1 raise from costing you lakhs.",
  },
  {
    keys: ["cess"],
    term: "Health & education cess",
    answer: "A flat 4% added on top of your income tax plus surcharge. Everyone pays it; it's in every TaxSense number you see.",
  },
  {
    keys: ["new regime", "old regime", "which regime", "regime"],
    term: "Old vs new regime",
    answer:
      "Two parallel tax systems. New (default): lower slab rates, ₹75k standard deduction, 87A makes ≤₹12L income tax-free — but almost no deductions. Old: higher rates but HRA, 80C, 80D, NPS and home-loan interest can slash taxable income. Rule of thumb: heavy rent + maxed deductions → old often wins; otherwise new. TaxSense computes both, always, and shows the exact difference.",
  },
  {
    keys: ["itr-1", "itr 1", "sahaj", "itr-2", "itr 2", "itr-3", "itr 3", "itr-4", "sugam", "which itr", "itr form"],
    term: "ITR forms",
    answer:
      "ITR-1 (Sahaj): resident, income ≤ ₹50L, salary + one house property (+ equity LTCG within the ₹1.25L exemption, new from AY 2025-26). ITR-2: capital gains beyond that, two+ properties, or income > ₹50L. ITR-3: business/professional income with books. ITR-4 (Sugam): presumptive business income ≤ ₹50L. TaxSense picks yours automatically — see the Planner tab.",
  },
  {
    keys: ["form 16"],
    term: "Form 16",
    answer:
      "Your employer's annual TDS certificate, issued by mid-June. Part A shows tax deposited against your PAN; Part B breaks down salary and deductions. It's the fastest source for your exact gross salary and basic+DA — the two numbers TaxSense needs most.",
  },
  {
    keys: ["ais", "26as", "form 26as", "tis"],
    term: "AIS / Form 26AS",
    answer:
      "The tax department's own record of your money: TDS, interest, dividends, share sales, big purchases. Download both from incometax.gov.in before filing and reconcile — mismatches between your return and AIS are the #1 cause of notices.",
  },
  {
    keys: ["234f", "late filing", "deadline", "due date"],
    term: "Filing deadline & late fee",
    answer:
      "For FY 2025-26 (AY 2026-27) the usual due date is 31 July 2026 for non-audit filers. Miss it and s.234F charges ₹5,000 (₹1,000 if income ≤ ₹5L), you lose loss carry-forwards, and interest keeps running. File early — refunds also arrive faster.",
  },
];

/** Detect a definitional question and answer it locally. Returns null if not a glossary hit. */
export function glossaryAnswer(message: string): { term: string; answer: string } | null {
  const m = message.toLowerCase().trim();
  const asking =
    /\b(what is|what's|whats|explain|meaning of|kya hota hai|kya hai|tell me about|define|how does)\b/.test(m) ||
    /\?$/.test(m);
  if (!asking) return null;
  // longest-key match wins (so "80ccd(1b)" beats "80c")
  let best: { entry: GlossaryEntry; len: number } | null = null;
  for (const e of GLOSSARY) {
    for (const k of e.keys) {
      if (m.includes(k) && (!best || k.length > best.len)) best = { entry: e, len: k.length };
    }
  }
  if (!best) return null;
  return { term: best.entry.term, answer: best.entry.answer };
}
