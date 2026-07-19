/**
 * Batch 36 — the professional suite catalog. Single source of truth for
 * what exists, who it's for, and which plan unlocks it. Everything is
 * VISIBLE to everyone; execution is gated by entitlements.
 */
export type Segment = "student" | "practitioner" | "firm";
export type Tier = "free" | "pro" | "business";

export interface ProTool {
  id: string;
  title: string;
  desc: string;
  href: string;
  segment: Segment;
  tier: Tier;
  icon: string;
}

export const SEGMENT_META: Record<Segment, { title: string; tagline: string }> = {
  student: {
    title: "Law students",
    tagline: "Learn the Income-tax Act the way it actually computes — free forever.",
  },
  practitioner: {
    title: "Lawyers & practitioners",
    tagline: "The calculations you redo for every client, done once and done right.",
  },
  firm: {
    title: "Firms & advanced",
    tagline: "Run your whole client book through the engine.",
  },
};

export const PRO_TOOLS: ProTool[] = [
  // ---------- Law students (free) ----------
  {
    id: "slabs", title: "Slab & Rebate Explorer", icon: "📈",
    desc: "Watch tax curve vs income for both regimes — see the ₹12L 87A cliff and marginal relief with your own eyes.",
    href: "/tools/slabs", segment: "student", tier: "free",
  },
  {
    id: "sections", title: "Section Quick-Reference", icon: "📖",
    desc: "The 24 sections that matter in practice — plain-language holding plus a practitioner's note for each.",
    href: "/tools/sections", segment: "student", tier: "free",
  },
  {
    id: "harvest", title: "LTCG Harvesting Planner", icon: "🌾",
    desc: "The ₹1.25L s.112A exemption is use-it-or-lose-it — compute what to book before 31 March and the 12.5% you avoid.",
    href: "/tools/harvest", segment: "student", tier: "free",
  },
  {
    id: "hra", title: "HRA Exemption Calculator", icon: "🏠",
    desc: "Rule 2A's min-of-three, with the binding limb highlighted — exam answer and client answer in one.",
    href: "/tools/hra", segment: "student", tier: "free",
  },
  {
    id: "quiz", title: "The Tax-Law Quiz", icon: "🎓",
    desc: "12 questions from real practice — 87A, Rule 2A, 44ADA, 234C safe harbour. Every miss teaches the section.",
    href: "/tools/quiz", segment: "student", tier: "free",
  },
  {
    id: "glossary", title: "Tax Glossary", icon: "🔤",
    desc: "Every term the Act throws at you, explained like a human.",
    href: "/learn", segment: "student", tier: "free",
  },
  // ---------- Practitioners (Pro) ----------
  {
    id: "interest", title: "Interest Calculator — 234A/B/C", icon: "⚖️",
    desc: "Late filing, advance-tax default and quarter-wise deferment — Rule 119A rounding, 12%/36% safe harbour, presumptive schedule. The notice-reply workhorse.",
    href: "/tools/interest", segment: "practitioner", tier: "pro",
  },
  {
    id: "breakeven", title: "Regime Breakeven Matrix", icon: "🎯",
    desc: "At what deduction level does the old regime beat the new — across an income grid. Advise in seconds, not spreadsheets.",
    href: "/tools/breakeven", segment: "practitioner", tier: "pro",
  },
  {
    id: "notices", title: "Notice Helper", icon: "📨",
    desc: "143(1), 139(9), 143(2), 148A, 245, demand notices — what each means, the clock it starts, and the response checklist.",
    href: "/tools/notices", segment: "practitioner", tier: "pro",
  },
  {
    id: "calendar", title: "Deadline Calendar (.ics)", icon: "📅",
    desc: "Every due date into Google/Apple/Outlook Calendar in one click, day-before alarms included.",
    href: "/tools/calendar", segment: "practitioner", tier: "free",
  },
  {
    id: "tds", title: "26AS TDS Reconciliation", icon: "🧾",
    desc: "Paste the 26AS, get every credit extracted, de-duped, totalled by section and matched against the return — without the statement leaving the browser.",
    href: "/tools/tds", segment: "practitioner", tier: "pro",
  },
  {
    id: "ctc", title: "CTC Designer", icon: "🧩",
    desc: "The salary structure to recommend — basic %, HRA and employer NPS optimized jointly.",
    href: "/app", segment: "practitioner", tier: "pro",
  },
  {
    id: "pdfs", title: "Unlimited Filing Summaries", icon: "📄",
    desc: "Branded computation PDFs for every client, every revision — no daily cap.",
    href: "/app", segment: "practitioner", tier: "pro",
  },
  // ---------- Firms (Business) ----------
  {
    id: "clients", title: "Client Workbook", icon: "🗂️",
    desc: "Every client's profile, regime call and liability in one table — open any of them in the workspace and pick up where you left off.",
    href: "/pro/clients", segment: "firm", tier: "business",
  },
  {
    id: "campaigns", title: "Deadline Reminder Service", icon: "🔔",
    desc: "Your clients get D-7 and D-1 emails before every due date — you get the credit.",
    href: "/deadlines", segment: "firm", tier: "business",
  },
];

export function toolUnlocked(t: ProTool, features: { proTools?: boolean; clientWorkbook?: boolean } | null | undefined): boolean {
  if (t.tier === "free") return true;
  if (!features) return false;
  if (t.tier === "pro") return !!features.proTools;
  return !!features.clientWorkbook;
}
