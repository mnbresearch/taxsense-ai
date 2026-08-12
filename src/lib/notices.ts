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
  /** Batch 78 — a copy-ready skeleton reply; [BRACKETS] are fill-ins. */
  draftReply: string;
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
    draftReply: `Subject: Response to intimation u/s 143(1) — PAN [PAN], AY 2026-27, DIN [DIN]

To the Deputy Commissioner of Income-tax, CPC, Bengaluru

1. The assessee has received the captioned intimation dated [DATE] proposing an adjustment of Rs. [AMOUNT] on account of [REASON STATED IN INTIMATION].
2. The adjustment arises from [TDS credit mismatch with Form 26AS / arithmetic difference / disallowance of claim], which is factually incorrect for the following reasons:
   (a) [Form 26AS as on date reflects TDS of Rs. X against the return figure of Rs. X — statement enclosed];
   (b) [The claim u/s [SECTION] is supported by (document), enclosed].
3. It is respectfully submitted that the proposed adjustment falls outside the scope of s.143(1)(a) and may be dropped. In the alternative, the assessee requests rectification u/s 154.
4. Enclosures: [26AS extract / Form 16 / proof of claim].

Filed online through the e-Proceedings tab within the 30-day window.
[NAME], PAN [PAN], [DATE]`,
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
    draftReply: `Subject: Response to defect notice u/s 139(9) — PAN [PAN], AY 2026-27, DIN [DIN]

1. The return filed on [DATE] vide acknowledgement [ACK NO.] has been marked defective for: [DEFECT CODE + DESCRIPTION AS STATED].
2. The defect has been cured as follows: [corrected schedule/detail filed — e.g., audit report attached / income-details schedule completed / tax paid and challan updated].
3. The corrected return is being filed within the 15-day window (or the time as extended). It is prayed that the return be treated as valid from the original filing date u/s 139(9).

Response filed via e-File → e-Proceedings → Defective Notice.
[NAME], PAN [PAN], [DATE]`,
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
    draftReply: `Subject: Preliminary submission — scrutiny notice u/s 143(2) — PAN [PAN], AY 2026-27, DIN [DIN]

To the National Faceless Assessment Centre

1. The assessee acknowledges the captioned notice dated [DATE] selecting the return for [complete / limited] scrutiny on the issue(s) of: [ISSUES LISTED].
2. Authorisation: the assessee is represented by [NAME, CAPACITY], vide letter of authority enclosed.
3. On the issues identified, the assessee submits the following at the outset: [one-paragraph position per issue, each anchored to the supporting document].
4. Documents enclosed: [list — bank statements, ledgers, Form 16/26AS, agreements].
5. The assessee requests that further requisitions, if any, be specific to the issues selected, and undertakes to respond within the time allowed through the faceless portal.

[NAME], PAN [PAN], [DATE]`,
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
    draftReply: `Subject: Reply to show-cause notice u/s 148A(b) — PAN [PAN], AY [YEAR], DIN [DIN]

1. The notice alleges that income of Rs. [AMOUNT] has escaped assessment based on: [INFORMATION QUOTED IN NOTICE].
2. Preliminary objections:
   (a) The information relied upon is [incorrect / already disclosed in the return filed on DATE, at schedule X];
   (b) [Limitation: the notice is beyond the period permissible u/s 149(1) since the alleged escapement is below Rs. 50 lakh];
   (c) The mandatory conditions of s.148A [prior approval / opportunity / material] have not been satisfied to the extent of [SPECIFY].
3. On merits: the transaction of Rs. [AMOUNT] is [explained — source, taxability, matching entry in return/AIS], as evidenced by the enclosed [DOCUMENTS].
4. It is accordingly prayed that the proceedings be dropped and no order u/s 148A(d) be passed. The assessee requests to be heard before any adverse view.

[NAME], PAN [PAN], [DATE]`,
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
    draftReply: `Subject: Response to intimation u/s 245 — proposed adjustment of refund — PAN [PAN], DIN [DIN]

1. The intimation proposes to adjust the refund of Rs. [AMOUNT] for AY 2026-27 against an outstanding demand of Rs. [AMOUNT] for AY [YEAR].
2. The assessee DISAGREES with the adjustment because the demand is [incorrect / already paid vide challan (CIN) dated [DATE] / under rectification u/s 154 filed on [DATE] / stayed by order dated [DATE]].
3. Supporting documents are enclosed: [challan copy / rectification acknowledgement / stay order].
4. It is prayed that the refund be released without adjustment; response is being submitted within the 21-day window on the portal (Pending Actions → Response to Outstanding Demand).

[NAME], PAN [PAN], [DATE]`,
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
    draftReply: `Subject: Rectification request — late fee u/s 234F wrongly levied — PAN [PAN], AY 2026-27, DIN [DIN]

1. The intimation levies a fee of Rs. [1,000/5,000] u/s 234F treating the return filed on [DATE] as belated.
2. The levy is incorrect because: [the return was filed on or before the due date as extended by CBDT Circular No. [X] of [YEAR] / total income is below Rs. 2.5 lakh and filing was not mandatory u/s 139(1) / the fee has been computed at Rs. 5,000 although total income does not exceed Rs. 5 lakh].
3. A rectification u/s 154 is accordingly sought; the acknowledgement and computation are enclosed.

[NAME], PAN [PAN], [DATE]`,
  },
];
