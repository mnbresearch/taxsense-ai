import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { demoStore, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Data-rights endpoint (DPDP Act-aligned):
 *  GET    → export everything we hold about the user (portability)
 *  DELETE → queue account deletion (30-day grace, then hard purge)
 */
export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ export: demoStore.get("demo-user") ?? {}, mode: "demo" });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const [profiles, messages, events, pdfs, deletion] = await Promise.all([
    sb.from("tax_profiles").select("*"),
    sb.from("intake_messages").select("role, content, created_at"),
    sb.from("audit_events").select("event, created_at"),
    sb.from("pdf_history").select("created_at, regime, total_tax, profile, estimates"),
    sb.from("deletion_requests").select("status, requested_at, purge_after").maybeSingle(),
  ]);
  return NextResponse.json({
    export: {
      account: { id: auth.user.id, email: auth.user.email, created_at: auth.user.created_at },
      profiles: profiles.data ?? [],
      chat_transcripts: messages.data ?? [],
      audit_trail: events.data ?? [],
      pdf_history: pdfs.data ?? [],
      deletion_request: deletion.data ?? null,
    },
  });
}

export async function DELETE() {
  const sb = await supabaseServer();
  if (!sb) {
    demoStore.delete("demo-user");
    return NextResponse.json({ deleted: true, mode: "demo" });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const { error } = await sb
    .from("deletion_requests")
    .upsert({ user_id: auth.user.id, status: "pending", requested_at: new Date().toISOString(), purge_after: new Date(Date.now() + 30 * 86_400_000).toISOString() });
  if (error) return serverError("account", error);
  await supabaseAdmin()?.from("audit_events").insert({ user_id: auth.user.id, event: "deletion_requested" });
  return NextResponse.json({
    queued: true,
    note: "Your data will be permanently deleted after a 30-day grace period. Sign in again within 30 days to cancel.",
  });
}

/** Cancel a pending deletion (also happens automatically on next sign-in). */
export async function PATCH() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ cancelled: true, mode: "demo" });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const { error } = await sb.from("deletion_requests").update({ status: "cancelled" }).eq("user_id", auth.user.id).eq("status", "pending");
  if (error) return serverError("account", error);
  await supabaseAdmin()?.from("audit_events").insert({ user_id: auth.user.id, event: "deletion_cancelled" });
  return NextResponse.json({ cancelled: true });
}
