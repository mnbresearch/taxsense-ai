/** Session (cookie) actor for the developer console. Demo mode → a fixed demo user. */
import { NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { rateLimitShared } from "@/lib/rateLimit";
import { getApiStore, type ApiStore } from "./store";
import type { Actor } from "./keyService";

export async function sessionActor(): Promise<{ ok: true; actor: Actor; store: ApiStore } | { ok: false; res: NextResponse }> {
  const sb = await supabaseServer();
  if (!sb) return { ok: true, actor: { userId: "00000000-0000-4000-8000-000000000000", isAdmin: true }, store: getApiStore() };
  const { data } = await sb.auth.getUser();
  if (!data.user) return { ok: false, res: NextResponse.json({ error: "Sign in to manage API keys." }, { status: 401 }) };
  const rl = await rateLimitShared(`devconsole:${data.user.id}`, 30, 60, { capacity: 30, refillPerMinute: 30 });
  if (!rl.allowed) return { ok: false, res: NextResponse.json({ error: "Too many requests — wait a minute." }, { status: 429 }) };
  return { ok: true, actor: { userId: data.user.id, isAdmin: isAdminEmail(data.user.email) }, store: getApiStore() };
}

/** Security audit trail (never includes secrets). */
export async function auditKeyEvent(event: string, userId: string, meta: Record<string, unknown>) {
  try { await supabaseAdmin()?.from("audit_events").insert({ user_id: userId, event, meta }); } catch { /* best effort */ }
}

export const ERR_STATUS: Record<string, number> = { invalid_request: 400, forbidden: 403, not_found: 404, conflict: 409, unavailable: 503, payment_required: 402 };

/** Wrap a console route: unexpected errors (e.g. migration 0014 not applied yet) → clean 503. */
export function guarded<A extends unknown[]>(fn: (...args: A) => Promise<NextResponse>) {
  return async (...args: A): Promise<NextResponse> => {
    try { return await fn(...args); }
    catch (e) {
      console.error("[dev console]", (e as Error)?.message);
      return NextResponse.json({ error: "The API platform isn't available yet (database migration 0014 pending) — try again later." }, { status: 503 });
    }
  };
}
