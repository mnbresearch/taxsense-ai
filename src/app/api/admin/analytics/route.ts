import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: funnel, activation, revenue (verified ledger) and API usage. Aggregates only. */
export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days"))) ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await admin.rpc("analytics_summary", { p_since: since });
  if (error) {
    if (/analytics_summary|function/i.test(error.message)) return NextResponse.json({ error: "Run migration 0014 to enable analytics." }, { status: 503 });
    return serverError("admin/analytics", error);
  }
  return NextResponse.json({ days, since, summary: data }, { headers: { "cache-control": "no-store" } });
}
