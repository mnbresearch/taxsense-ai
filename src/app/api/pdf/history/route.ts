import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch 30 — the signed-in user's past filing summaries (latest 20). */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json({ items: [], mode: "demo" });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ items: [], mode: "anonymous" });
  const { data, error } = await sb
    .from("pdf_history")
    .select("id, profile, estimates, regime, total_tax, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [], mode: "supabase" });
}
