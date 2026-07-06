import { NextResponse } from "next/server";
import { demoEvents, demoStore, isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin metrics — aggregates only, never raw financial data. */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) {
    // demo mode
    return NextResponse.json({
      mode: "demo",
      stats: {
        users: demoStore.size,
        profiles: demoStore.size,
        computed: [...demoStore.values()].filter((r) => r.computation).length,
        messages: demoEvents.filter((e) => e.event === "chat_turn").length,
        pdfs: demoEvents.filter((e) => e.event === "pdf_generated").length,
        pending_deletions: 0,
        signups_7d: demoStore.size,
        regime_split: {},
      },
    });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 500 });
  const { data, error } = await admin.rpc("admin_stats");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mode: "supabase", stats: data });
}
