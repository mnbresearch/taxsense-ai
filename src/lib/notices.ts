/**
 * Batch 43 — the notice helper. The six notices individual taxpayers
 * actually receive, each with what it means, the clock it starts, and
 * the response checklist a practitioner works through.
 */
export interface NoticeGuide {
  id: string;
  section: string;
  title: string;
  fear: 1 | 2 | 3; // 1 routine · 2 attention · 3 serious
  meaning: string;
  deadline: string;
  checklist: string[];
  escalation: string;
  tags: string[];
}

export const NOTICES: NoticeGuide[] = [
  {
    id: "143-1",
    section: "143(1)",
    title: "Intimation after processing",
    fear: 1,
    meaning:
      "CPC's automated processing result — a comparison of your return against its own computation. It's an intimation, not an assessment. Three outcomes: no change, refund, or demand (usually TDS mismatch or an arithmetic adjustment).",
    deadline: "30 days to respond to a proposed adjustment; demands carry their own payment timeline.",
    checklist: [
      "Match the CPC computation column-by-column against the filed return — find the exact delta first",
      "Reconcile TDS with Form 26AS/AIS (the cause in most demands) — use the 26AS tool here",
      "If CPC is right: pay the demand or let the refund adjust; consider rectification of your own figures next year",
      "If CPC is wrong: file a rectification u/s 154 online with the specific mistake apparent from record",
      "Check whether the adjustment was one CPC is even allowed to make u/s 143(1)(a) — many aren't",
    ],
    escalation: "Unresolved 154 → grievance on the e-filing portal → appeal u/s 246A to CIT(A) within 30 days of the 154 order.",
    tags: ["routine", "cpc", "demand"],
  },
  {
    id: "139-9",
    section: "139(9)",
    title: "Defective return",
    fear: 1,
    meaning:
      "The return has a curable defect — missing schedule, unpaid self-assessment tax, wrong ITR form, or incomplete audit details. Fix it and the original filing date survives.",
    deadline: "15 days from service (extendable on request before expiry).",
    checklist: [
      "Read the exact defect code in the notice annexure — respond to THAT defect, not generally",
      "Fix in the e-filing portal under 'e-Proceedings → Respond to defective notice'",
      "If tax was unpaid: pay first, then respond with the challan details",
      "If the wrong ITR form was used: refile in the correct form as the defect response",
      "Missing the deadline makes the return INVALID — as if never filed; belated-return consequences follow",
    ],
    escalation: "Defect response rejected → file a fresh return if still within time; otherwise condonation u/s 119(2)(b).",
    tags: ["routine", "procedural"],
  },
  {
    id: "143-2",
    section: "143(2)",
    title: "Scrutiny notice",
    fear: 3,
    meaning:
      "Your return is selected for detailed examination — limited (specific issues) or complete scrutiny. Almost always faceless now (s.144B). The notice must be served within 3 months from the end of the FY in which the return was filed.",
    deadline: "Response dates are set per-questionnaire in the e-Proceedings tab — every date matters.",
    checklist: [
      "FIRST: verify the notice is within the s.143(2) limitation period — late service voids the assessment",
      "Identify scope: limited scrutiny cannot roam beyond its stated issues without conversion approval",
      "Build a document file per issue raised: bank statements, 26AS, broker P&L, loan statements, gift deeds",
      "Respond ONLY through e-Proceedings, before each date; seek adjournment in writing if needed",
      "Never ignore a questionnaire — silence invites a best-judgment assessment u/s 144",
      "Engage a professional — scrutiny responses create the record any appeal will live on",
    ],
    escalation: "Adverse order u/s 143(3) → appeal to CIT(A) u/s 246A within 30 days; stay of demand application u/s 220(6) alongside.",
    tags: ["serious", "scrutiny", "faceless"],
  },
  {
    id: "148a",
    section: "148A(b)",
    title: "Reassessment show-cause",
    fear: 3,
    meaning:
      "The AO believes income escaped assessment and must give you this show-cause BEFORE reopening u/s 148. Your reply here can kill the reassessment before it starts. Limitation: 3 years from the AY's end (5 years where escaped income ≥ ₹50L, post-2024).",
    deadline: "Not less than 7 days to reply (the notice states it; extensions are routinely sought).",
    checklist: [
      "Check limitation FIRST — count the years; a time-barred 148A(b) is fatal to the whole proceeding",
      "Demand the underlying information/material if the notice doesn't annex it — you're entitled to it",
      "Reply on merits: explain the transaction with documents (the 'information' is often an AIS/SFT entry you can fully explain)",
      "Take every procedural objection ON RECORD now — approval u/s 151, vague information, mechanical satisfaction",
      "If a s.148 notice still follows with the 148A(d) order, file the return under protest and ask for reasons",
    ],
    escalation: "148A(d) order against you → writ petition (procedural defects) or contest in reassessment; adverse 147 order → CIT(A).",
    tags: ["serious", "reassessment"],
  },
  {
    id: "245",
    section: "245",
    title: "Refund set-off intimation",
    fear: 2,
    meaning:
      "The department proposes adjusting your current refund against an OLD outstanding demand — often a demand you dispute or never knew existed.",
    deadline: "Typically 21 days to agree or disagree on the portal before the set-off proceeds.",
    checklist: [
      "Open 'Response to Outstanding Demand' and check the demand's year, section and current status",
      "If the demand is wrong or already paid: disagree with reasons + attach the challan/rectification order",
      "If a rectification killed the demand but the ledger didn't update: raise a grievance with the order reference",
      "If genuine: agree, or pay separately if you need the refund whole",
      "Track that your disagreement was acted on — set-offs execute silently after the window",
    ],
    escalation: "Set-off executed despite valid disagreement → grievance → jurisdictional AO letter → CIT(A) if a live appealable order exists.",
    tags: ["refund", "demand"],
  },
  {
    id: "234f",
    section: "234F / 156",
    title: "Late-fee / demand notice",
    fear: 2,
    meaning:
      "A demand u/s 156 quantifying what the department says you owe — commonly the ₹5,000 late-filing fee (₹1,000 if income ≤ ₹5L) plus 234A/B/C interest after a belated filing.",
    deadline: "Pay within 30 days of service to stop further s.220(2) interest at 1%/month.",
    checklist: [
      "Verify the fee tier: income ≤ ₹5L should be charged ₹1,000, not ₹5,000 — CPC gets this wrong",
      "Recompute the interest trail with the 234 calculator here — confirm each section's months",
      "If correct: pay via challan ITNS-280 (minor head 400 — tax on regular assessment)",
      "If wrong: rectification u/s 154 with the computation attached",
      "Keep the challan against the demand ID — orphan payments cause repeat notices",
    ],
    escalation: "Fee/interest wrongly levied and 154 fails → CIT(A); for pure 220(2) hardship, waiver petition u/s 220(2A).",
    tags: ["demand", "late-filing"],
  },
];
