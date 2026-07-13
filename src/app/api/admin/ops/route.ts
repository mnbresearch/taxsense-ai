import { NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: system status — providers, last keep-alive run, recent admin actions. */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });

  const { data: keepalive } = await admin
    .from("audit_events")
    .select("created_at, meta")
    .eq("event", "cron_keepalive")
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: adminActions } = await admin
    .from("audit_events")
    .select("event, meta, created_at")
    .in("event", ["admin_campaign_sent", "admin_lead_deleted"])
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    providers: {
      intake: process.env.GROQ_API_KEY ? "groq" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock",
      email: process.env.RESEND_API_KEY ? "resend" : "not configured",
      cronSecret: process.env.CRON_SECRET ? "set" : "not set (optional)",
    },
    lastKeepalive: keepalive?.[0] ?? null,
    adminActions: adminActions ?? [],
  });
}
