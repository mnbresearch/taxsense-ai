import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const sb = supabaseServer();
  if (!sb) return { error: NextResponse.json({ error: "supabase not configured" }, { status: 500 }) };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const admin = supabaseAdmin();
  if (!admin) return { error: NextResponse.json({ error: "service key not configured" }, { status: 500 }) };
  return { admin, who: auth.user.email };
}

/** Admin-only: deadline-reminder subscribers. */
export async function GET() {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const { data, error } = await g.admin
    .from("tax_reminders")
    .select("email, active, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subs: data });
}

/** Admin-only: deactivate a subscriber (e.g. someone replied STOP). Audited. */
export async function DELETE(req: NextRequest) {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().slice(0, 120);
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const { error } = await g.admin.from("tax_reminders").update({ active: false }).eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await g.admin.from("audit_events").insert({ event: "admin_reminder_deactivated", meta: { email, by: g.who } });
  return NextResponse.json({ ok: true });
}
