/** Batch 62 — the public build log. Newest first. */
export interface ChangeEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-07-27",
    title: "Launch week — the Professional Suite goes public",
    items: [
      "Traffic analytics land in the founder dashboard (privacy-light: paths only, never people)",
      "The Tax-Law Quiz doubles to a 24-question bank with a fresh random 12 every attempt",
      "Quiz finishers can join the update list in one tap",
      "Branded link-preview cards for the Professional Suite",
    ],
  },
  {
    date: "2026-07-26",
    title: "Email Studio + a landing page that sells",
    items: [
      "Admin Email Studio: reusable templates, one-click audiences, open-rate analytics per template",
      "Every campaign email carries a signed one-click unsubscribe; opted-out addresses are never emailed again",
      "Landing page: live deadline countdown, who-it's-for paths, pricing upfront, honest FAQ",
      "Founder daily digest now reports opens, unsubscribes, activations and live MRR",
    ],
  },
  {
    date: "2026-07-24",
    title: "Tools for the people who do this for a living",
    items: [
      "Notice Helper: 143(1) → 148A playbooks with deadlines, checklists and escalation paths (Pro)",
      "26AS TDS Reconciliation — fully in-browser; your statement never leaves the tab (Pro)",
      "s.234A/B/C Interest Calculator with Rule 119A rounding and the 12%/36% safe harbour (Pro)",
      "Free: gratuity + s.10(10) exemption, 80GG rent, LTCG harvesting, tax-deadline calendar (.ics)",
    ],
  },
  {
    date: "2026-07-22",
    title: "The Professional Suite arrives",
    items: [
      "One catalog, three audiences: law students (free forever), practitioners (Pro), firms (Business)",
      "Slab & Rebate Explorer — watch 87A and marginal relief on a live engine-drawn curve",
      "Section Quick-Reference: the 24 sections that dominate practice, each with a practice note",
      "Client Workbook: your whole client book, one click into a conversational workspace per client (Business)",
      "Regime Breakeven Matrix: the deduction level where old beats new, per income (Pro)",
    ],
  },
  {
    date: "2026-07-20",
    title: "Plans that unlock things, and an app that updates itself",
    items: [
      "Magic-link sign-in; paid plans unlock the CTC Designer, unlimited PDFs and practitioner tools",
      "हिंदी mode — the interface and the conversation itself",
      "Per-user PDF history with one-click re-download",
      "Instant sample profiles and a welcome-back restore",
      "The app auto-updates in place the moment we ship — including installed phone versions",
    ],
  },
  {
    date: "2026-07-13",
    title: "TaxSense AI launches",
    items: [
      "Conversational tax intake — describe your income, get both regimes computed with section-cited math",
      "Tax Health Score, ₹-quantified optimizer moves, filing-summary PDFs, Form-16 paste",
      "Installable phone app, deadline reminder emails, share links and WhatsApp cards",
    ],
  },
];
