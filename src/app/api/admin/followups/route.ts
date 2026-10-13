import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { serverError } from "@/lib/http";
import { PAY_CATALOG } from "@/lib/cashfree";
import { followupEmail, loadConfig, normalizeConfig, runCheckoutFollowups } from "@/lib/followups";
import { isUndeliverable, sendOne } from "@/lib/email";
import { whatsappConfigured } from "@/lib/messaging/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const sb = await supabaseServer();
  if (!sb) return { error: NextResponse.json({ error: "supabase not configured" }, { status: 500 }) };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const admin = supabaseAdmin();
  if (!admin) return { error: NextResponse.json({ error: "service key not configured" }, { status: 500 }) };
  return { admin, who: auth.user.email!.toLowerCase(), userId: auth.user.id };
}

/** Config + the 50 most recent follow-up records (emails masked). */
export async function GET() {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  try {
    const config = await loadConfig(g.admin);
    const { data, error } = await g.admin.from("checkout_followups").select("order_id, email, status, reason, created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const mask = (e: string) => e.replace(/^(.).*?(@.*)$/, "$1•••$2");
    return NextResponse.json({ config, whatsapp: whatsappConfigured() ? "configured" : "not configured", recent: (data ?? []).map((r) => ({ ...r, email: mask(r.email) })) });
  } catch (e) {
    if (/checkout_followups|app_settings/i.test(String((e as Error)?.message))) return NextResponse.json({ error: "Run migration 0014 to enable follow-ups." }, { status: 503 });
    return serverError("admin/followups", e);
  }
}

/** Update config (enabled, dryRun, delayHours, maxPerRun). Audited. */
export async function PATCH(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({}));
  const config = normalizeConfig({ ...(await loadConfig(g.admin)), ...(body ?? {}) });
  const { error } = await g.admin.from("app_settings").upsert({ key: "checkout_followups", value: config, updated_at: new Date().toISOString() });
  if (error) return serverError("admin/followups", error);
  await g.admin.from("audit_events").insert({ user_id: g.userId, event: "admin_followups_config", meta: { ...config, by: g.who } });
  return NextResponse.json({ config });
}

/** action=run → process now (respects dryRun; runs even if disabled). action=test → sample email to `to` (default: you). */
export async function POST(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const body = (await req.json().catch(() => ({}))) as { action?: string; to?: string };
  if (body.action === "run") {
    const r = await runCheckoutFollowups(g.admin, { force: true });
    await g.admin.from("audit_events").insert({ user_id: g.userId, event: "admin_followups_run", meta: { ...r, by: g.who } });
    return NextResponse.json(r);
  }
  if (body.action === "test") {
    const to = (body.to ?? g.who).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || isUndeliverable(to)) return NextResponse.json({ error: "valid test recipient required" }, { status: 400 });
    const msg = followupEmail(Object.keys(PAY_CATALOG)[0], to);
    const r = await sendOne({ to, subject: `[TEST] ${msg.subject}`, html: msg.html, kind: "custom" });
    return NextResponse.json({ sent: r.ok, to, error: r.ok ? undefined : r.error });
  }
  return NextResponse.json({ error: "action must be run or test" }, { status: 400 });
}
