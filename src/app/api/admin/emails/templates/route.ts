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
  return NextResponse.json({ templates: data ?? [] });
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
