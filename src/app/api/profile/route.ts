import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { computeBoth } from "@/lib/tax-engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { demoStore, supabaseServer } from "@/lib/supabase/server";
import { getEntitlementsForEmail } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Save (upsert) the user's profile + cached computation. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "profile too large" }, { status: 413 });
  let body: { profile?: unknown; intakeState?: unknown; label?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }
  const { profile: rawProfile, intakeState } = body;
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : "My profile";
  if (!rawProfile) return NextResponse.json({ error: "profile required" }, { status: 400 });
  const parsed = safeParseProfile(rawProfile);
  if (!parsed.ok) return NextResponse.json({ error: `invalid profile — ${parsed.error}` }, { status: 400 });
  const profile = parsed.profile;
  const computation = computeBoth(profile);

  const sb = await supabaseServer();
  if (!sb) {
    demoStore.set("demo-user", {
      profile,
      computation,
      intake_state: intakeState ?? null,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ saved: true, mode: "demo" });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in to save" }, { status: 401 });

  // Server-side plan limit on how many separate profiles/clients can be stored
  // (UI limits alone are bypassable). Updating an existing label is always fine.
  const ent = await getEntitlementsForEmail(auth.user.email);
  const maxProfiles = ent.features.clientWorkbook ? 500 : ent.features.scenarios + 1;
  const { data: existing } = await sb.from("tax_profiles").select("label").eq("fy", "FY2025-26").limit(600);
  const labels = (existing ?? []).map((r: { label: string }) => r.label);
  if (!labels.includes(label) && labels.length >= maxProfiles) {
    return NextResponse.json(
      { error: `Your plan stores up to ${maxProfiles} profile${maxProfiles === 1 ? "" : "s"} — delete one or upgrade.`, upgrade: true },
      { status: 402 }
    );
  }

  const { error } = await sb.from("tax_profiles").upsert(
    {
      user_id: auth.user.id,
      fy: "FY2025-26",
      label,
      profile,
      computation,
      intake_state: intakeState ?? null,
    },
    { onConflict: "user_id,fy,label" }
  );
  if (error) return serverError("profile", error);
  return NextResponse.json({ saved: true, mode: "supabase" });
}

/** Load the user's latest profile — or a specific one via ?label= (Batch 38). */
export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  if (!sb) {
    const rec = demoStore.get("demo-user");
    return NextResponse.json({ record: rec ?? null, mode: "demo" });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ record: null, mode: "anonymous" });
  const label = req.nextUrl.searchParams.get("label");
  let q = sb
    .from("tax_profiles")
    .select("profile, computation, intake_state, updated_at, label")
    .eq("fy", "FY2025-26");
  if (label) q = q.eq("label", label.slice(0, 120));
  const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ record: data ?? null, mode: "supabase" });
}

/** Batch 57 — remove a saved profile/client by label. RLS scopes to the owner. */
export async function DELETE(req: NextRequest) {
  const sb = await supabaseServer();
  if (!sb) {
    demoStore.delete("demo-user");
    return NextResponse.json({ deleted: true, mode: "demo" });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const label = req.nextUrl.searchParams.get("label");
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });
  const { error } = await sb
    .from("tax_profiles")
    .delete()
    .eq("fy", "FY2025-26")
    .eq("label", label.slice(0, 120));
  if (error) return serverError("profile", error);
  return NextResponse.json({ deleted: true });
}
