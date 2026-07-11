import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { sendCampaign } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // campaign sends are sequential

async function requireAdmin() {
  const sb = supabaseServer();
  if (!sb) return { error: NextResponse.json({ error: "supabase not configured" }, { status: 500 }) };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email))
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const admin = supabaseAdmin();
  if (!admin) return { error: NextResponse.json({ error: "service key not configured" }, { status: 500 }) };
  return { admin };
}

/** Admin-only: email activity log (latest 200). */
export async function GET() {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const { data, error } = await g.admin
    .from("email_log")
    .select("to_email, subject, kind, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data });
}

const ComposeInput = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  recipients: z.array(z.string().email().max(120)).min(1).max(200),
});

/** Admin-only: compose + send a campaign email to selected recipients. */
export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const parsed = ComposeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "need subject, body and 1–200 valid recipient emails" }, { status: 400 });
  const { subject, body, recipients } = parsed.data;

  // Personalise with lead names where we know them.
  const { data: leads } = await g.admin.from("access_requests").select("email, name").limit(1000);
  const nameByEmail = new Map((leads ?? []).map((l) => [l.email.toLowerCase(), l.name as string | null]));

  const results = await sendCampaign({
    subject,
    body,
    recipients: recipients.map((email) => ({ email, name: nameByEmail.get(email.toLowerCase()) ?? null })),
  });
  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: true, sent, failed: failed.length, failures: failed.slice(0, 10) });
}
