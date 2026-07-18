/**
 * Plan entitlements (Batch 28 — plan gating).
 * "active" in access_requests was previously only a billing record; this
 * module turns it into real feature access, keyed by the signed-in email.
 */
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";

export type PlanId = "free" | "pro" | "business" | "concierge" | "filed";

export interface Features {
  /** CTC Designer (salary-structure optimizer) */
  ctcDesigner: boolean;
  /** Practitioner tools — 234 interest calculator, regime breakeven matrix */
  proTools: boolean;
  /** Multi-client workbook for firms */
  clientWorkbook: boolean;
  /** Max saved what-if scenarios in the workspace */
  scenarios: number;
  /** PDF filing summaries per day (null = unlimited) */
  pdfPerDay: number | null;
  /** Human-readable plan label for UI badges */
  label: string;
}

export const PLAN_FEATURES: Record<PlanId, Features> = {
  free:      { ctcDesigner: false, proTools: false, clientWorkbook: false, scenarios: 1, pdfPerDay: 2,    label: "Starter (free)" },
  pro:       { ctcDesigner: true,  proTools: true,  clientWorkbook: false, scenarios: 3, pdfPerDay: null, label: "Pro" },
  business:  { ctcDesigner: true,  proTools: true,  clientWorkbook: true,  scenarios: 3, pdfPerDay: null, label: "Business" },
  concierge: { ctcDesigner: true,  proTools: true,  clientWorkbook: true,  scenarios: 3, pdfPerDay: null, label: "Concierge" },
  filed:     { ctcDesigner: true,  proTools: true,  clientWorkbook: false, scenarios: 3, pdfPerDay: null, label: "Filed For You" },
};

/**
 * access_requests.plan holds free-text like "Pro (₹399/mo or ₹3,999/yr)".
 * An active row with no plan (e.g. beta access grant) is treated as Pro.
 */
export function normalizePlan(plan: string | null | undefined): PlanId {
  const p = (plan ?? "").trim().toLowerCase();
  if (p.startsWith("business")) return "business";
  if (p.startsWith("concierge")) return "concierge";
  if (p.startsWith("filed")) return "filed";
  if (p.startsWith("pro")) return "pro";
  return "pro"; // active but unlabelled → smallest paid tier
}

export interface Entitlements {
  signedIn: boolean;
  email: string | null;
  plan: PlanId;
  active: boolean;
  features: Features;
}

export function freeEntitlements(email: string | null = null, signedIn = false): Entitlements {
  return { signedIn, email, plan: "free", active: false, features: PLAN_FEATURES.free };
}

/** Look up entitlements for an email. Server-only (service role). */
export async function getEntitlementsForEmail(email: string | null | undefined): Promise<Entitlements> {
  if (!email) return freeEntitlements();
  const e = email.trim().toLowerCase();
  if (!supabaseConfigured()) return freeEntitlements(e, true);
  const admin = supabaseAdmin();
  if (!admin) return freeEntitlements(e, true);
  const { data } = await admin
    .from("access_requests")
    .select("plan, status")
    .ilike("email", e)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!data) return freeEntitlements(e, true);
  const plan = normalizePlan(data.plan);
  return { signedIn: true, email: e, plan, active: true, features: PLAN_FEATURES[plan] };
}
