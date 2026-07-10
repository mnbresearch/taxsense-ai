/**
 * Intake conversation engine (Session 3).
 * Deterministic core + LLM at the edges:
 *  - LLM extracts a partial update from the user's message (validated by zod)
 *  - THIS module merges it into the profile and decides what's still missing
 *  - LLM phrases the next question in the CA voice
 * The profile can therefore never be corrupted by a hallucinated extraction.
 */
import { emptyProfile } from "../tax-engine";
import type { TaxProfile } from "../tax-engine";
import { ExtractionSchema, type Extraction } from "./schema";
import { EXTRACTION_SYSTEM_PROMPT, QUESTION_PLAN, RESPONDER_SYSTEM_PROMPT } from "./prompts";
import { getProvider, type ChatMessage } from "./provider";

export interface IntakeState {
  profile: TaxProfile;
  /** Sections the user said don't apply. */
  notApplicable: string[];
  /** Human-readable estimate notes accumulated across the chat. */
  estimates: string[];
  /** Topics already covered (question-plan keys). */
  covered: string[];
  complete: boolean;
}

export function newIntakeState(): IntakeState {
  return { profile: emptyProfile(), notApplicable: [], estimates: [], covered: [], complete: false };
}

/** Deep-merge a validated extraction into the profile (append house property). */
export function mergeExtraction(state: IntakeState, ex: Extraction): IntakeState {
  const p = JSON.parse(JSON.stringify(state.profile)) as TaxProfile;
  const u = ex.updates;
  if (u.age) p.age = u.age;
  if (u.salary) {
    p.salary = {
      grossSalary: 0, basicPlusDA: 0, hraReceived: 0, rentPaid: 0,
      isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
      ...(p.salary ?? {}),
      ...stripUndefined(u.salary),
    };
    // Sensible default if basic unknown: 50% of gross (flagged as estimate).
    if (p.salary.grossSalary > 0 && p.salary.basicPlusDA === 0) {
      p.salary.basicPlusDA = Math.round(p.salary.grossSalary * 0.5);
    }
  }
  if (u.houseProperty && Object.keys(stripUndefined(u.houseProperty)).length > 0) {
    p.houseProperties = [
      {
        use: u.houseProperty.use ?? "self-occupied",
        annualRent: u.houseProperty.annualRent ?? 0,
        municipalTaxes: u.houseProperty.municipalTaxes ?? 0,
        homeLoanInterest: u.houseProperty.homeLoanInterest ?? 0,
      },
      // keep at most the latest 2 properties in intake
      ...p.houseProperties.slice(0, 1),
    ];
  }
  if (u.capitalGains)
    p.capitalGains = {
      stcg111A: 0, stcgOther: 0, ltcg112A: 0, ltcgOther: 0,
      ...(p.capitalGains ?? {}),
      ...stripUndefined(u.capitalGains),
    };
  if (u.business)
    p.business = { netIncome: 0, presumptive: false, ...(p.business ?? {}), ...stripUndefined(u.business) };
  if (u.otherSources)
    p.otherSources = {
      savingsInterest: 0, fdInterest: 0, dividends: 0, familyPension: 0, other: 0,
      ...(p.otherSources ?? {}),
      ...stripUndefined(u.otherSources),
    };
  if (u.deductions) p.deductions = { ...p.deductions, ...stripUndefined(u.deductions) };
  if (u.taxesPaid !== undefined) p.taxesPaid = u.taxesPaid;

  const notApplicable = [...new Set([...state.notApplicable, ...ex.notApplicable])];
  const estimates = [...state.estimates, ...ex.estimates];
  const next = { ...state, profile: p, notApplicable, estimates };
  return { ...next, covered: coveredTopics(next), complete: isComplete(next) };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function coveredTopics(s: IntakeState): string[] {
  const c: string[] = [];
  const p = s.profile;
  const hasIncome = !!(p.salary?.grossSalary || p.business?.netIncome || p.capitalGains || p.otherSources || p.houseProperties.length);
  if (hasIncome) c.push("incomeSources");
  if (p.salary?.grossSalary) c.push("salary.grossSalary");
  if (!p.salary || p.salary.basicPlusDA > 0) c.push("salary.basicPlusDA");
  if (!p.salary || p.salary.rentPaid > 0 || p.salary.hraReceived === 0) c.push("salary.rent");
  if (p.houseProperties.length || s.notApplicable.includes("houseProperty")) c.push("houseProperty");
  if (p.capitalGains || s.notApplicable.includes("capitalGains")) c.push("capitalGains");
  if (p.otherSources || s.notApplicable.includes("otherSources")) c.push("otherSources");
  if (
    s.notApplicable.includes("deductions") ||
    Object.values(p.deductions).some((v) => typeof v === "number" && v > 0)
  )
    c.push("deductions");
  if (p.taxesPaid > 0) c.push("taxesPaid");
  return c;
}

function isComplete(s: IntakeState): boolean {
  const needed = ["incomeSources", "houseProperty", "capitalGains", "otherSources", "deductions"];
  return needed.every((k) => coveredTopics(s).includes(k));
}

export function nextQuestion(s: IntakeState): string | null {
  const covered = coveredTopics(s);
  const q = QUESTION_PLAN.find((q) => !covered.includes(q.key));
  return q?.question ?? null;
}

export interface IntakeTurn {
  reply: string;
  state: IntakeState;
  extraction: Extraction;
  providerName: string;
}

/** One full conversational turn: extract → merge → respond. */
export async function runIntakeTurn(
  state: IntakeState,
  history: ChatMessage[],
  userMessage: string
): Promise<IntakeTurn> {
  const provider = getProvider();

  // 1 — extract (validated; on failure, fall back to an empty extraction)
  let extraction: Extraction;
  try {
    const raw = await provider.completeJson([
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      ...history.slice(-6),
      { role: "user", content: userMessage },
    ]);
    extraction = ExtractionSchema.parse(JSON.parse(jsonOnly(raw)));
  } catch (err) {
    // Log the failure shape server-side so we can tune the prompt/schema.
    console.error("[intake] extraction parse failed:", (err as Error)?.message?.slice(0, 300));
    extraction = { updates: {}, notApplicable: [], estimates: [], clarify: null };
  }

  // 2 — merge deterministically
  const newState = mergeExtraction(state, extraction);

  // 3 — respond in the CA voice
  const missing = nextQuestion(newState);
  const contextBlock = [
    `PROFILE SNAPSHOT: ${JSON.stringify(newState.profile)}`,
    `ESTIMATES SO FAR: ${newState.estimates.join("; ") || "none"}`,
    `EXTRACTION FROM LAST MESSAGE: ${JSON.stringify(extraction)}`,
    extraction.clarify
      ? `CLARIFY FIRST: ${extraction.clarify}`
      : missing
        ? `NEXT TOPIC TO ASK: ${missing}`
        : "ALL SECTIONS COVERED: summarise the profile and ask the user to confirm before computing.",
  ].join("\n");

  let reply: string;
  try {
    reply = await provider.completeText([
      { role: "system", content: RESPONDER_SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: userMessage },
      { role: "system", content: contextBlock },
    ]);
  } catch {
    reply = extraction.clarify ?? missing ?? "Great — I have everything. Ready to compute your taxes under both regimes?";
  }

  return { reply, state: newState, extraction, providerName: provider.name };
}

function jsonOnly(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}
