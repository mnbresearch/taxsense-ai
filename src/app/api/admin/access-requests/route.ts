import { NextRequest, NextResponse } from "next/server";
import { demoEvents, isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: the access-request leads list. */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) {
    const leads = demoEvents
      .filter((e) => e.event.startsWith("access_request:"))
      .map((e) => ({ email: e.event.split(":")[1], created_at: e.at, name: null, source: "demo" }));
    return NextResponse.json({ mode: "demo", leads: leads.slice(-100).reverse() });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const { data, error } = await admin
    .from("access_requests")
    .select("email, name, source, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", leads: data });
}

/** Admin-only: remove a lead (e.g. test entries) by email. Audited. */
export async function DELETE(req: NextRequest) {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().slice(0, 120);
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const { error } = await admin.from("access_requests").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_events").insert({ event: "admin_lead_deleted", meta: { email, by: auth.user.email } });
  return NextResponse.json({ ok: true });
}
