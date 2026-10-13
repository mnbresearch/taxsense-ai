/**
 * First-party product analytics (no third-party trackers, no cookies).
 * Events are a closed list with whitelisted props — never emails, names,
 * phone numbers, incomes, tokens, card or key data.
 */
import { supabaseAdmin } from "@/lib/supabase/server";

export const EVENTS = {
  // web (beacon)
  page_view: ["referrer_host"],
  plan_selected: ["plan"],
  onboarding_completed: [],
  feature_used: ["feature"],
  // server
  signup: [],
  login_attempt: [],
  login_success: [],
  login_failed: [],
  checkout_started: ["plan_key", "amount"],
  checkout_abandoned: ["plan_key"],
  payment_succeeded: ["plan_key", "amount", "renewal"],
  payment_failed: ["plan_key"],
  subscription_activated: ["plan_key", "renewal"],
  subscription_cancelled: ["reason"],
  api_key_created: ["kind"],
  api_key_revoked: ["kind"],
  api_key_rotated: ["kind"],
  webhook_endpoint_created: [],
} as const satisfies Record<string, readonly string[]>;
export type EventName = keyof typeof EVENTS;

/** Events a browser may report; everything else is server-attested only. */
export const CLIENT_EVENTS: EventName[] = ["page_view", "plan_selected", "onboarding_completed", "feature_used"];

export const FEATURES = [
  "chat", "compute", "pdf", "form16_import", "share", "planner", "ctc_designer", "filing_kit", "tool",
] as const;

const PLAN_VALUES = ["pro", "business", "filed", "concierge"];

export function isEventName(e: unknown): e is EventName {
  return typeof e === "string" && Object.prototype.hasOwnProperty.call(EVENTS, e);
}

/** Keep only whitelisted, short, scalar props. */
export function sanitizeProps(event: EventName, props: unknown): Record<string, string | number | boolean> {
  const allowed = EVENTS[event] as readonly string[];
  const out: Record<string, string | number | boolean> = {};
  if (!props || typeof props !== "object") return out;
  for (const k of allowed) {
    const v = (props as Record<string, unknown>)[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.replace(/[^\w\-./:]/g, "").slice(0, 60);
  }
  if (event === "plan_selected" && typeof out.plan === "string" && !PLAN_VALUES.includes(out.plan)) delete out.plan;
  if (event === "feature_used" && !(FEATURES as readonly string[]).includes(String(out.feature))) return {};
  return out;
}

export function cleanPath(p: unknown): string | null {
  const s = String(p ?? "").split("?")[0].split("#")[0].slice(0, 80);
  return /^\/[a-z0-9\-\/]*$/i.test(s) ? s : null;
}

export function cleanAnonId(a: unknown): string | null {
  return typeof a === "string" && /^[a-f0-9-]{36}$/.test(a) ? a : null;
}

/** Fire-and-forget server-side event. Never throws. */
export async function track(
  event: EventName,
  opts: { userId?: string | null; anonId?: string | null; source?: "web" | "server" | "api"; path?: string | null; props?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const sb = supabaseAdmin();
    if (!sb) return;
    await sb.from("product_events").insert({
      event,
      user_id: opts.userId ?? null,
      anon_id: opts.anonId ?? null,
      source: opts.source ?? "server",
      path: opts.path ?? null,
      props: sanitizeProps(event, opts.props ?? {}),
    });
  } catch { /* analytics must never break a request */ }
}

/** login_success, plus a one-time `signup` the first time an account logs in. */
export async function trackLogin(userId: string): Promise<void> {
  await track("login_success", { userId });
  try {
    const sb = supabaseAdmin();
    if (!sb) return;
    const { count } = await sb.from("product_events").select("id", { count: "exact", head: true }).eq("event", "signup").eq("user_id", userId);
    if (!count) await track("signup", { userId });
  } catch { /* ignore */ }
}
