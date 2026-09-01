/**
 * Batch 91 — The Tax-Saving Playbook.
 * Real strategies, real sections, real numbers — and the honest watch-outs.
 * Every figure here is computed the way the engine computes it; case studies
 * are ILLUSTRATIVE composites (clearly labelled), not client testimonials.
 */

export type Audience = "salaried" | "business" | "investor" | "property" | "family";

export interface Strategy {
  id: string;
  audience: Audience;
  title: string;
  /** One-line hook with the ₹ number. */
  hook: string;
  /** How it actually works — plain talk. */
  how: string;
  /** Statutory basis. */
  sections: string;
  /** The honest part: conditions, documentation, where people get caught. */
  watchOut: string;
}

export const STRATEGIES: Strategy[] = [
  // ------------------------------ Salaried ------------------------------
  {
    id: "employer-nps", audience: "salaried",
    title: "Employer NPS — the deduction that survives the new regime",
    hook: "Up to 14% of basic, deductible in BOTH regimes — ₹65,500+/yr saved at 30% slab on a ₹15L basic",
    how: "Almost every deduction died in the new regime — 80CCD(2) didn't. Ask HR to restructure your CTC so the employer contributes up to 14% of basic+DA to NPS. Your CTC stays identical; your taxable salary drops by the full contribution.",
    sections: "s.80CCD(2) — 14% limit in the new regime (10% old, private sector).",
    watchOut: "It's YOUR money but locked till 60 (partial exits allowed). Needs employer payroll support — the CTC Designer prints the exact structure to send HR.",
  },
  {
    id: "rent-to-parents", audience: "salaried",
    title: "Pay rent to your parents — HRA works inside the family",
    hook: "₹25k/mo rent to a retired parent ≈ ₹75,000/yr saved — and the family keeps every rupee",
    how: "Living in your parents' house? Pay them real rent by bank transfer and claim HRA (old regime). Your exemption is real; their rental income is often below their exemption limit — plus they get the 30% standard deduction on it. Money never leaves the family.",
    sections: "s.10(13A) + Rule 2A; parent declares income u/s 22-24.",
    watchOut: "This survives scrutiny ONLY done properly: rent agreement, monthly bank transfers, parent OWNS the house, parent shows the income in their ITR, landlord PAN to your employer above ₹1L/yr. Cash 'rent' to a parent who never files is how people get caught.",
  },
  {
    id: "car-lease", audience: "salaried",
    title: "Company car lease beats a car loan",
    hook: "Lease via CTC and a ₹12L car can cost ₹2-3L less over 4 years than buying from taxed salary",
    how: "If your employer offers a car-lease policy, the lease rent comes out of PRE-tax CTC and the taxable perquisite is only ₹1,800-2,400/month. Compare that with paying EMIs out of income that's already been taxed at 30%.",
    sections: "Perquisite valuation — Rule 3(2).",
    watchOut: "Employer policy required; the car usually belongs to the lessor till buyout. Best for those firmly in the 30% slab.",
  },
  {
    id: "regime-timing", audience: "salaried",
    title: "Pick your regime per year — it's not a marriage",
    hook: "Salaried filers can switch regimes EVERY year — big-deduction years (home loan + 80C + HRA) go old, light years go new",
    how: "The right answer changes with your life: bought a house → old regime year; deductions dried up → new regime year. Run both every single year instead of assuming.",
    sections: "s.115BAC(6) — salaried can choose annually at filing; business income gets one switch (10-IEA).",
    watchOut: "Business income locks the choice — that's the trap. The workspace computes both regimes on every profile automatically.",
  },
  // ------------------------------ Business ------------------------------
  {
    id: "presumptive", audience: "business",
    title: "Presumptive taxation — the scheme designed to be generous",
    hook: "A freelancer with ₹30L receipts can legally pay tax on just ₹15L — often ₹3.5L+ less than an employee earning the same",
    how: "44ADA lets professionals declare 50% of receipts as income, no books, no expense proofs. If your real costs are a laptop and Wi-Fi, the other ~45% is legally tax-free margin. Small businesses get 44AD at 6-8%. Parliament WROTE it this way to simplify small-business tax.",
    sections: "s.44ADA (professionals ≤ ₹75L digital), s.44AD (business ≤ ₹3cr digital).",
    watchOut: "Declare BELOW the floor and you're into books + audit (44AB(e)). Opt out of 44AD and you're locked out for 5 years. Keep receipts digital to earn the higher limits — the Audit Desk checks your exact position.",
  },
  {
    id: "depreciation", audience: "business",
    title: "Depreciation timing — the September deadline nobody tells you about",
    hook: "Buy a ₹20L machine and PUT IT TO USE before ~30 September → up to ₹7L deduction in year one (₹2.18L tax saved at 30%)",
    how: "Assets used for 180+ days get FULL-year depreciation; miss it and you get half. Plant & machinery: 15% normal + 20% ADDITIONAL depreciation for manufacturers on new machinery = 35% of cost as a year-one deduction. Timing a planned purchase 6 months earlier doubles the first-year write-off.",
    sections: "s.32(1)(ii), s.32(1)(iia) additional depreciation, second proviso (180-day rule).",
    watchOut: "Additional depreciation needs manufacturing/production and NEW machinery (not second-hand, not cars). 'Put to use' means actually operating — installation certificates and first-use records matter. Old regime/normal provisions (not presumptive).",
  },
  {
    id: "80jjaa", audience: "business",
    title: "s.80JJAA — get paid 30% extra for hiring",
    hook: "Hire 10 people at ₹20k/mo → an EXTRA ₹7.2L deduction per year, for 3 years (₹21.6L total) — on salaries you were paying anyway",
    how: "Audited businesses get an additional 30% deduction on new employees' wages for 3 consecutive years. Effectively the government funds a slice of your hiring: 100% of the salary is a normal expense AND 30% more on top.",
    sections: "s.80JJAA.",
    watchOut: "Employee must earn ≤ ₹25,000/month, work 240+ days in the year (150 for apparel/footwear/leather), be in EPF, and headcount must actually INCREASE. Needs Form 10DA from an accountant. Works in 115BAA companies too — one of the few incentives that survives.",
  },
  {
    id: "family-payroll", audience: "business",
    title: "Put family on the payroll — for work they actually do",
    hook: "₹6L salary to a spouse who runs your accounts: deductible for the business, often near-zero tax in their hands — up to ₹1.8L/yr kept in the family",
    how: "A genuine salary to a family member who genuinely works (accounts, admin, content, dispatch) is a deductible business expense, and gets taxed at THEIR slab — usually starting from zero. You convert 30%-taxed profit into 0-5%-taxed family salary.",
    sections: "s.37(1); disallowance risk u/s 40A(2) for excessive payments to relatives.",
    watchOut: "The work must be real and the pay market-rate — attendance of work product, bank-paid salary, their own ITR. Salary to a spouse with no role invites 40A(2) disallowance AND clubbing u/s 64(1)(ii).",
  },
  {
    id: "firm-structure", audience: "business",
    title: "Proprietor vs partnership — structure changes the tax",
    hook: "A family partnership can pull ₹7.8L out of ₹10L profit as partner remuneration — taxed at partners' low slabs instead of one person's 30%",
    how: "A firm deducts working-partner remuneration up to the 40(b) ceiling and 12% interest on capital. Profit that would pile up in one proprietor's top slab gets split across partners' lower slabs.",
    sections: "s.40(b) (limits raised by FA 2024), s.184.",
    watchOut: "Firm pays flat 30% on what remains; from FY 2025-26 the firm must deduct TDS u/s 194T on partner payments. Run the Audit & Entity Desk's 40(b) calculator on your numbers before restructuring.",
  },
  // ------------------------------ Investor ------------------------------
  {
    id: "harvesting", audience: "investor",
    title: "Harvest ₹1.25L of equity gains every single year",
    hook: "Sell-and-rebuy before 31 March, every year: ₹15,625 saved annually, ₹1.5L+ over a decade — for an hour of clicking",
    how: "The first ₹1.25L of long-term equity gains each year is TAX-FREE — but unused exemption vanishes on 1 April. Sell winners up to the limit, buy them back, and your cost basis steps up permanently.",
    sections: "s.112A.",
    watchOut: "Mind exit loads, STT and a day of market movement between sell and rebuy. There's no wash-sale rule in India today. The Harvesting Planner computes your exact number.",
  },
  {
    id: "loss-harvesting", audience: "investor",
    title: "Losses are assets — book them, carry them, use them",
    hook: "A ₹2L booked loss can wipe the tax on ₹2L of gains — now or any time in the next 8 years",
    how: "Short-term losses set off against ANY capital gain; long-term against long-term. Sitting on losers in December? Book the loss before 31 March, offset your winners, and carry the rest forward 8 years.",
    sections: "ss.70-74.",
    watchOut: "Carry-forward requires filing ON TIME — a belated return burns the loss forever. That deadline alone pays for the discipline.",
  },
  {
    id: "family-fd", audience: "family",
    title: "Move FDs to senior-citizen parents' names — gift first, invest after",
    hook: "₹20L of FDs shifted to a retired parent: interest lands in THEIR file — 80TTB + senior slabs can turn ₹1.4L of taxed interest into ₹0",
    how: "Gifts to parents are tax-free AND clubbing does not apply to parents (only spouse/minor children/son's wife). Gift the capital, parent invests it, interest is theirs: senior citizens get ₹1L TDS threshold, 80TTB ₹50k deduction, and often an empty slab.",
    sections: "s.56(2)(x) relative exemption; s.64 clubbing (parents NOT covered); s.80TTB.",
    watchOut: "The gift must be real and irrevocable — gift deed, their account, their ITR. Works identically for major children with low income. Spouse/minor routes DON'T work — that's exactly what s.64 clubs back.",
  },
  {
    id: "huf", audience: "family",
    title: "An HUF is a whole extra taxpayer your family already owns",
    hook: "A separate ₹4L basic exemption + its own 87A rebate + its own 80C — worth ₹50k-1L/yr for families with ancestral or gifted capital",
    how: "A Hindu Undivided Family files its own return with its own slabs and deductions. Park ancestral property income, family-business profits or gifted capital in the HUF and a second exemption ladder opens up.",
    sections: "s.2(31); HUF taxed as a separate person.",
    watchOut: "Capital YOU gift to your own HUF triggers clubbing — seed it from ancestral assets, gifts at marriage, or gifts from non-members. Real bank account, PAN, and books. Once assets go in, they belong to the family, not you.",
  },
  // ------------------------------ Property ------------------------------
  {
    id: "joint-loan", audience: "property",
    title: "Buy jointly, deduct doubly",
    hook: "Co-owner spouses each claim ₹2L of home-loan interest — ₹1.25L/yr saved at 30% instead of ₹62k",
    how: "When both spouses co-own AND co-borrow AND co-pay, each gets the full ₹2L s.24(b) cap (old regime) and their own 80C principal slice. The same EMI, double the deduction envelope.",
    sections: "s.24(b), s.26 (co-owners assessed separately), s.80C(2)(xviii).",
    watchOut: "Deduction follows actual ownership share and actual repayment — both names on the deed, the loan, and the EMIs. One spouse paying everything while both claim is the audit-time unraveling.",
  },
  {
    id: "property-exit", audience: "property",
    title: "Selling property? The exemption menu beats the tax",
    hook: "A ₹40L gain can legally become ₹0 taxable — reinvest in a house (s.54/54F) or park up to ₹50L in bonds (s.54EC)",
    how: "Property LTCG has three legal exits: buy/build another house, invest the gain in 54EC bonds within 6 months, or both. Miss the timelines and a CGAS deposit before the ITR due date preserves the claim.",
    sections: "ss.54, 54F, 54EC; CGAS 1988.",
    watchOut: "New house sold within 3 years → exemption reverses. 54F needs near-FULL consideration reinvested and ≤1 other house. Run the Property Sale Planner BEFORE you sign the sale deed, not after.",
  },
];

/* --------------------------- Case studies ---------------------------- */

export interface CaseStudy {
  id: string;
  emoji: string;
  title: string;
  persona: string;
  /** The before/after story with real computed numbers. */
  story: string;
  saved: string;
  method: string;
  /** Pre-filled share text. */
  share: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "freelancer-44ada", emoji: "🧑‍💻",
    title: "The ₹30L freelancer who pays less tax than a ₹15L employee",
    persona: "UX designer, ₹30L receipts, works from home",
    story: "As an employee earning ₹30L she'd pay ₹4,75,800 (new regime). As a freelancer on 44ADA she declares 50% — ₹15L — and pays ₹1,09,200. Same skills, same clients, ₹3,66,600 less tax — because Parliament built presumptive taxation to work exactly like this.",
    saved: "₹3,66,600 every year",
    method: "s.44ADA presumptive + new regime",
    share: "A ₹30L freelancer legally pays ₹1.09L tax while a ₹30L employee pays ₹4.76L. Section 44ADA is the most under-used law in India. Computed on TaxSense AI → https://taxsense.mnbresearch.com/playbook",
  },
  {
    id: "machine-depreciation", emoji: "🏭",
    title: "The machine bought in September, not October",
    persona: "Garment manufacturer, ₹20L new stitching line",
    story: "Same machine, two dates. Installed by late September: 15% + 20% additional depreciation = ₹7,00,000 off year-one profit — ₹2,18,400 tax saved at the 30% slab. Installed in October: half rates, roughly half the benefit delayed a year. The 180-day rule turned a calendar decision into ₹1L+ of cash flow.",
    saved: "₹2,18,400 in year one",
    method: "s.32 depreciation + s.32(1)(iia) additional + 180-day timing",
    share: "Buying machinery? The DATE decides lakhs: put to use 180+ days → 35% first-year depreciation on new plant. A ₹20L machine = ₹2.18L tax saved. The 180-day rule, explained → https://taxsense.mnbresearch.com/playbook",
  },
  {
    id: "hiring-80jjaa", emoji: "👥",
    title: "The startup that got paid to hire",
    persona: "D2C brand, 10 new hires at ₹20k/month",
    story: "Wages of ₹24L/yr were always deductible. s.80JJAA added 30% MORE — ₹7.2L extra deduction each year for three years. ₹21.6L of additional deductions on hiring they were doing anyway ≈ ₹5.4L+ tax saved for a 115BAA company.",
    saved: "₹5.4L+ over three years",
    method: "s.80JJAA additional employee-cost deduction",
    share: "Almost no founder knows s.80JJAA: hire at ≤₹25k/mo (EPF, 240 days) and deduct 130% of their wages for 3 years. 10 hires ≈ ₹5.4L tax saved. Details → https://taxsense.mnbresearch.com/playbook",
  },
  {
    id: "rent-to-mother", emoji: "🏠",
    title: "₹75,000 saved by paying rent at home",
    persona: "₹18L salaried engineer living in his mother's house",
    story: "He transfers ₹25,000/month rent to his retired mother — agreement, bank trail, her PAN with HR. His HRA exemption: ₹2,40,000, saving ~₹75,000 (old regime, 31.2%). Her side: ₹3L rent minus 30% standard deduction = ₹2.1L — below her senior-citizen exemption. Family tax: ~zero. Money moved from his pocket to his mother's.",
    saved: "≈ ₹75,000 every year",
    method: "HRA u/s 10(13A) + parent's s.24(a) standard deduction",
    share: "Living with parents? Paying them REAL rent (agreement + bank transfer + their ITR) can save ₹75k/yr in HRA — and the money stays in the family. The right way to do it → https://taxsense.mnbresearch.com/playbook",
  },
  {
    id: "decade-harvest", emoji: "🌾",
    title: "The hour a year worth ₹1.56 lakh",
    persona: "SIP investor, ₹12k/month in index funds",
    story: "Every March she sells winners up to ₹1.25L of long-term gain and buys them back the same week. Tax on the harvested gain: ₹0 (s.112A exemption). Cost basis: stepped up. Ten years of this one-hour ritual: ₹1,56,250 of tax that will never be owed.",
    saved: "₹15,625/yr — ₹1.56L per decade",
    method: "s.112A ₹1.25L annual exemption, harvested yearly",
    share: "The ₹1.25L LTCG exemption RESETS every 1 April — unused = gone. Harvest + rebuy each March = ₹15,625/yr saved for an hour of clicking. Calculator → https://taxsense.mnbresearch.com/tools/harvest",
  },
  {
    id: "couple-property", emoji: "👫",
    title: "One flat, two deductions",
    persona: "Working couple, ₹80L flat, ₹64L joint loan",
    story: "Deed, loan and EMIs all 50:50. Each claims ₹2L of s.24(b) interest — ₹4L household deduction instead of ₹2L — plus two 80C principal slices. Extra tax saved vs single ownership: ₹62,400 every year of the loan (old regime, 31.2%).",
    saved: "₹62,400/yr extra",
    method: "s.26 co-ownership + dual s.24(b) caps",
    share: "Couples: register the flat AND the loan in both names. Two ₹2L interest caps instead of one = ₹62k/yr extra saved. The co-ownership math → https://taxsense.mnbresearch.com/playbook",
  },
];
