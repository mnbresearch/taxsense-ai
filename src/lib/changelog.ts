/** Batch 62 — the public build log. Newest first. */
export interface ChangeEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-08-12",
    title: "TaxSense starts acting like your CA",
    items: [
      "The ITR Filing Kit: which form applies to YOU, the exact documents to gather, and a portal-accurate e-filing walkthrough — free, at /tools/filing",
      "Scrutiny Risk Radar: the mismatches that actually trigger 143(1) notices — AIS gaps, landlord-PAN rules, refund checks, 10-IEA timing — each with a fix",
      "The chat now nudges like a CA: missed deductions with ₹ impact, AIS awareness, belated-return deadlines",
      "Document checklist remembers what you've collected, on this device",
      "Rent Receipt Generator: 12 print-ready HRA receipts in 30 seconds, compliance rules baked in — free",
      "Notice Helper now includes copy-ready draft reply skeletons for all six notices (Pro)",
    ],
  },
  {
    date: "2026-08-07",
    title: "Sign in from any device + a phone-friendly workspace",
    items: [
      "Sign-in email now carries a 6-digit code you can type on ANY device — no more links that only work where you requested them",
      "The sign-in email is fully TaxSense-branded, sent from updates.mnbresearch.com, with a one-tap fallback link",
      "The workspace is mobile-first: responsive header, scrollable chat panel, and layouts that fit your phone",
      "TaxSense now lives at taxsense.mnbresearch.com — the old address redirects automatically",
    ],
  },
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
