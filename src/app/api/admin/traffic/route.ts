import { NextResponse } from "next/server";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch 60 — 7-day pageview counts by path (admin only). */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("audit_events")
    .select("meta, created_at")
    .eq("event", "pageview")
    .gte("created_at", since)
    .limit(10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byPath: Record<string, number> = {};
  let today = 0;
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  for (const r of data ?? []) {
    const p = (r as any).meta?.path ?? "?";
    byPath[p] = (byPath[p] ?? 0) + 1;
    if (new Date((r as any).created_at) >= dayStart) today += 1;
  }
  const paths = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([path, views]) => ({ path, views }));
  // Batch 65 — client errors from the same window, so problems surface fast.
  const { data: errs } = await admin
    .from("audit_events")
    .select("event, meta, created_at")
    .like("event", "client_error:%")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  const byMsg: Record<string, number> = {};
  for (const e of errs ?? []) {
    const m = ((e as any).meta?.message ?? "unknown").slice(0, 120);
    byMsg[m] = (byMsg[m] ?? 0) + 1;
  }
  const errors = Object.entries(byMsg).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([message, count]) => ({ message, count }));
  return NextResponse.json({ total7d: (data ?? []).length, today, paths, errorCount7d: (errs ?? []).length, errors });
}
