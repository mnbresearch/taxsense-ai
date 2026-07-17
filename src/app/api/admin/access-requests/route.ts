import { NextRequest, NextResponse } from "next/server";
import { demoEvents, isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { brandedShell, sendOne } from "@/lib/email";

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
    .select("email, name, source, phone, plan, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", leads: data });
}

/** Admin-only: mark a lead paid & active — sends the activation email. Audited. */
export async function PATCH(req: NextRequest) {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().slice(0, 120);
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { data: lead, error } = await admin
    .from("access_requests")
    .update({ status: "active" })
    .eq("email", email)
    .select("name, plan")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const first = (lead?.name ?? "").trim().split(" ")[0];
  await sendOne({
    to: email,
    subject: `🎉 You're in — your TaxSense AI ${lead?.plan ? "plan" : "access"} is active`,
    kind: "custom",
    html: brandedShell(
      `Welcome aboard${first ? ", " + first : ""}!`,
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">Your ${lead?.plan ? `<strong>${lead.plan}</strong> plan` : "access"} on <strong>TaxSense AI</strong> is now active. Sign in with this email address and everything is unlocked.</p>
       <p style="margin:18px 0;"><a href="https://taxsense-ai.vercel.app/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Open TaxSense AI →</a></p>
       <p style="color:#78716c;font-size:12px;line-height:1.6;">Pro tip: tap "📲 Get the app" inside to install it on your phone. Questions? Just reply — a human reads this inbox.</p>`
    ),
  });
  await admin.from("audit_events").insert({ event: "admin_lead_activated", meta: { email, plan: lead?.plan, by: auth.user.email } });
  return NextResponse.json({ ok: true });
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
