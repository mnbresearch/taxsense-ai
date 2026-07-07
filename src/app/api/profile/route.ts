import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { demoStore, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Save (upsert) the user's profile + cached computation. */
export async function POST(req: NextRequest) {
  const { profile: rawProfile, intakeState, label } = await req.json();
  if (!rawProfile) return NextResponse.json({ error: "profile required" }, { status: 400 });
  const parsed = safeParseProfile(rawProfile);
  if (!parsed.ok) return NextResponse.json({ error: `invalid profile — ${parsed.error}` }, { status: 400 });
  const profile = parsed.profile;
  const computation = computeBoth(profile);

  const sb = supabaseServer();
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
  const { error } = await sb.from("tax_profiles").upsert(
    {
      user_id: auth.user.id,
      fy: "FY2025-26",
      label: label ?? "My profile",
      profile,
      computation,
      intake_state: intakeState ?? null,
    },
    { onConflict: "user_id,fy,label" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, mode: "supabase" });
}

/** Load the user's latest profile. */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) {
    const rec = demoStore.get("demo-user");
    return NextResponse.json({ record: rec ?? null, mode: "demo" });
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ record: null, mode: "anonymous" });
  const { data } = await sb
    .from("tax_profiles")
    .select("profile, computation, intake_state, updated_at, label")
    .eq("fy", "FY2025-26")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ record: data ?? null, mode: "supabase" });
}
