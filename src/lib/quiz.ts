/**
 * Batch 40 — the tax-law quiz. Every answer is verifiable against the
 * engine or the section reference; explanations cite the section.
 */
export interface QuizQ {
  q: string;
  options: [string, string, string, string];
  answer: number; // index into options
  explain: string;
  sec: string;
}

export const QUIZ: QuizQ[] = [
  {
    q: "A resident earns ₹11.8L (new regime, FY 2025-26). Her income tax is…",
    options: ["₹0", "₹36,000", "₹75,400", "₹1,18,000"],
    answer: 0,
    explain: "Income up to ₹12L attracts a full s.87A rebate in the new regime — tax is nil (salary earners even get ₹75k standard deduction on top).",
    sec: "87A",
  },
  {
    q: "HRA exemption under Rule 2A is the ______ of the three limbs.",
    options: ["maximum", "average", "minimum", "sum"],
    answer: 2,
    explain: "s.10(13A) read with Rule 2A exempts the LEAST of: HRA received, rent − 10% of basic+DA, and 50%/40% of basic+DA.",
    sec: "10(13A)",
  },
  {
    q: "The standard deduction from salary in the NEW regime (FY 2025-26) is…",
    options: ["₹40,000", "₹50,000", "₹75,000", "Not available"],
    answer: 2,
    explain: "₹75,000 in the new regime vs ₹50,000 in the old — one of the few deductions the new regime kept and enlarged.",
    sec: "16(ia)",
  },
  {
    q: "A freelancer under s.44ADA with ₹20L gross receipts declares deemed income of…",
    options: ["₹20L", "₹10L", "₹12L", "₹5L"],
    answer: 1,
    explain: "44ADA presumes 50% of gross receipts as income for eligible professionals — ₹10L here, no books required.",
    sec: "44ADA",
  },
  {
    q: "Interest under s.234B applies when advance tax + TDS paid is less than…",
    options: ["100% of assessed tax", "90% of assessed tax", "75% of assessed tax", "50% of assessed tax"],
    answer: 1,
    explain: "Below the 90% threshold, 1%/month simple interest runs on the shortfall from 1 April of the assessment year.",
    sec: "234B",
  },
  {
    q: "The 234C safe harbour for the 15 June installment forgives shortfalls if you've paid at least…",
    options: ["15%", "12%", "10%", "5%"],
    answer: 1,
    explain: "The proviso to s.234C(1) spares interest if 12% (June) / 36% (September) of the tax is in — a 3-point cushion on the 15%/45% schedule.",
    sec: "234C",
  },
  {
    q: "LTCG on listed equity above the annual exemption is taxed at ______ (post-July 2024).",
    options: ["10% with indexation", "12.5% without indexation", "15% flat", "slab rates"],
    answer: 1,
    explain: "s.112A: 12.5% on gains above ₹1.25L/year, no indexation. The exemption is per year — harvest it annually.",
    sec: "112A",
  },
  {
    q: "A belated return (filed after the due date) forfeits…",
    options: ["the standard deduction", "carry-forward of business losses", "the 87A rebate", "TDS credits"],
    answer: 1,
    explain: "s.139(4) filers lose loss carry-forward (except house-property loss) and the option to elect the old regime for that year.",
    sec: "139",
  },
  {
    q: "Rent paid to your parents can support an HRA claim if…",
    options: ["it never can", "the rent is genuinely paid and they declare it as income", "it's below ₹1L/year", "you also claim 80GG"],
    answer: 1,
    explain: "Genuine transactions stand: money must actually move, and the parents must offer it as house-property income. Paper arrangements fail scrutiny.",
    sec: "10(13A)",
  },
  {
    q: "Under s.270A, MISREPORTING income attracts a penalty of ______ of the tax.",
    options: ["50%", "100%", "200%", "300%"],
    answer: 2,
    explain: "Under-reporting costs 50%; misreporting (falsified records, suppression) costs 200% — the distinction is the whole game in penalty replies.",
    sec: "270A",
  },
  {
    q: "A tenant paying ₹60,000/month rent to a resident landlord must…",
    options: ["do nothing special", "deduct 2% TDS u/s 194-IB", "pay GST on rent", "register the lease"],
    answer: 1,
    explain: "Individuals paying rent above ₹50k/month must deduct TDS u/s 194-IB — one of the most commonly missed compliance points.",
    sec: "194-IB",
  },
  {
    q: "Employer NPS contribution u/s 80CCD(2) is special because it…",
    options: ["has no monetary ceiling", "works in BOTH regimes", "is only for government staff", "counts inside 80C's ₹1.5L"],
    answer: 1,
    explain: "It survives the new regime (up to 14% of basic+DA) — which is why CTC restructuring remains powerful even for new-regime taxpayers.",
    sec: "80CCD(2)",
  },
  {
    q: "The late-filing fee u/s 234F for income above ₹5L is…",
    options: ["₹1,000", "₹5,000", "₹10,000", "1% per month"],
    answer: 1,
    explain: "Flat ₹5,000 (₹1,000 where income ≤ ₹5L). It's a FEE, not interest — no waiver jurisdiction, payable even on a nil-tax belated return if filing was mandatory.",
    sec: "234F",
  },
  {
    q: "Under s.54F, the exemption on selling ANY long-term asset requires reinvesting ______ in a residential house.",
    options: ["only the capital gain", "the full net consideration", "50% of the gain", "₹50L maximum"],
    answer: 1,
    explain: "54F needs the FULL net consideration reinvested (proportionate exemption otherwise) — unlike s.54, where reinvesting just the gain suffices.",
    sec: "54F",
  },
  {
    q: "A belated return can be filed up to…",
    options: ["31 March of the AY", "31 December of the AY", "the end of the next FY", "any time with penalty"],
    answer: 1,
    explain: "s.139(4): belated (and revised) returns are allowed until 31 December of the assessment year — after that, only ITR-U with additional tax.",
    sec: "139(4)",
  },
  {
    q: "Gratuity received by a Payment of Gratuity Act-covered employee is computed at ______ of last drawn salary per completed year.",
    options: ["15/26", "15/30", "1/2 month", "one full month"],
    answer: 0,
    explain: "15 days' wages on a 26-working-day month — 15/26 × last basic+DA × years (part-year above 6 months rounds UP). Exempt up to the least of formula, ₹20L lifetime cap, and amount received.",
    sec: "10(10)",
  },
  {
    q: "Standard scrutiny reassessment u/s 148 requires escaped income of at least ______ for notices beyond 3 years.",
    options: ["₹10L", "₹25L", "₹50L", "any amount"],
    answer: 2,
    explain: "Post-2024: 3 years standard limitation, extendable to 5 years only where escaped income is ₹50L or more. Always count the years first — a time-barred notice is fatal.",
    sec: "148",
  },
  {
    q: "Health insurance premium paid in CASH gets a deduction of…",
    options: ["full 80D limits", "half the limit", "nothing (except preventive check-ups)", "₹5,000 flat"],
    answer: 2,
    explain: "s.80D requires non-cash payment — cash kills the claim, with the sole exception of preventive health check-ups (₹5k, cash allowed).",
    sec: "80D",
  },
  {
    q: "The presumptive rate for small businesses u/s 44AD on digital receipts is…",
    options: ["8%", "6%", "50%", "10%"],
    answer: 1,
    explain: "6% for amounts received digitally/by banking channels; 8% for cash turnover. Professionals under 44ADA use 50% of gross receipts instead.",
    sec: "44AD",
  },
  {
    q: "Interest u/s 220(2) at 1%/month starts running when…",
    options: ["the return is filed late", "a demand notice isn't paid within 30 days", "advance tax is missed", "TDS isn't deposited"],
    answer: 1,
    explain: "Once a s.156 demand stays unpaid past 30 days from service, 220(2) interest runs — separate from and on top of the 234 family.",
    sec: "220(2)",
  },
  {
    q: "Savings-account interest is deductible u/s 80TTA up to…",
    options: ["₹10,000", "₹40,000", "₹50,000", "fully taxable"],
    answer: 0,
    explain: "₹10,000 across all savings accounts (old regime). Seniors instead get s.80TTB — ₹50,000 covering FD interest too.",
    sec: "80TTA",
  },
  {
    q: "House-property LOSS that can be set off against other income in a year is capped at…",
    options: ["₹1,50,000", "₹2,00,000", "uncapped", "₹3,00,000"],
    answer: 1,
    explain: "s.71(3A) caps the set-off at ₹2L/year; the excess carries forward 8 years — against house-property income only.",
    sec: "71(3A)",
  },
  {
    q: "Relief for salary ARREARS taxed at a higher rate is claimed under…",
    options: ["s.87A", "s.89 with Form 10E", "s.80C", "s.234C"],
    answer: 1,
    explain: "s.89 read with Rule 21A spreads arrears back to the years they relate to — but Form 10E must be filed BEFORE the return or CPC disallows it every time.",
    sec: "89",
  },
  {
    q: "For advance tax, capital gains arising mid-year attract no 234C interest if…",
    options: ["they're under ₹1L", "tax is paid in remaining installments", "they're long-term", "TDS was deducted"],
    answer: 1,
    explain: "The proviso spares unforeseeable income (capital gains, lottery) — pay the tax in the installments still due after the gain arises and 234C stays away.",
    sec: "234C",
  },
];
