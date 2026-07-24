import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  return { admin };
}

/**
 * Batch 51 — built-in starters: ready-to-send campaigns that appear until
 * you save a template of the same name over them. Sends from a starter are
 * tracked under its name like any other template.
 */
const STARTERS = [
  {
    name: "Suite launch (leads)",
    subject: "{name}, the tools tax professionals pay for — yours to explore",
    body: "Hi {name},\n\nWe just shipped the TaxSense AI Professional Suite \u2014 16+ tools on the same engine that computed your taxes:\n\n\u2696\ufe0f 234A/B/C interest calculator \u2014 the notice-reply workhorse\n\ud83e\uddfe 26AS reconciliation \u2014 paste the statement, get every credit matched (nothing leaves your browser)\n\ud83d\udcc8 Regime breakeven matrix \u2014 the exact deduction level where old beats new\n\ud83d\udcc5 Deadline calendar for your phone \u2014 free\n\nExplore everything at taxsense-ai.vercel.app/professional \u2014 the student tools are free forever, and your Pro plan unlocks the rest the moment it's active.\n\nWant me to activate you? Just reply to this email.",
  },
  {
    name: "Plan nudge (unconverted)",
    subject: "{name}, your TaxSense plan is one call away",
    body: "Hi {name},\n\nYou asked about a TaxSense AI plan \u2014 it's still waiting for you. The July 31 filing deadline is doing its thing, and Pro members are already using unlimited filing summaries, the CTC Designer and the practitioner toolkit.\n\nActivation is simple: we call, you pay by UPI or bank transfer, and your email unlocks everything within minutes.\n\nReply with a good time to call, or just ring us at +91 97114 88480.",
  },
  {
    name: "Feature update (active)",
    subject: "New in your TaxSense AI: {name}, here's what just unlocked",
    body: "Hi {name},\n\nYour plan just got more valuable \u2014 recent additions, all included:\n\n\ud83d\uddc2 Client Workbook \u2014 every client's regime call and liability in one table (Business)\n\ud83d\udce8 Notice Helper \u2014 143(1) to 148A playbooks with deadlines and checklists\n\ud83c\udf3e LTCG harvesting planner \u2014 use the \u20b91.25L exemption before 31 March\n\ud83c\udf81 Gratuity + s.10(10) exemption calculator\n\nIt's all live at taxsense-ai.vercel.app \u2014 sign in with this email address and everything's unlocked.\n\nQuestions? Just reply.",
  },
];

/** Batch 48 — template library. GET list / POST upsert / DELETE by name. */
export async function GET() {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const { data, error } = await g.admin
    .from("email_templates")
    .select("name, subject, body, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const saved = data ?? [];
  const savedNames = new Set(saved.map((t: any) => t.name));
  const starters = STARTERS.filter((t) => !savedNames.has(t.name)).map((t) => ({ ...t, updated_at: null, builtin: true }));
  return NextResponse.json({ templates: [...saved, ...starters] });
}

const TemplateInput = z.object({
  name: z.string().min(1).max(60),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const parsed = TemplateInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "need name, subject and body" }, { status: 400 });
  const { name, subject, body } = parsed.data;
  const { error } = await g.admin
    .from("email_templates")
    .upsert({ name: name.trim(), subject, body, updated_at: new Date().toISOString() }, { onConflict: "name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, name: name.trim() });
}

export async function DELETE(req: NextRequest) {
  const g = await requireAdmin();
  if ("error" in g) return g.error;
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const { error } = await g.admin.from("email_templates").delete().eq("name", name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
