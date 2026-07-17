import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { freeEntitlements, getEntitlementsForEmail } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who am I + what does my plan unlock? Safe for anonymous callers. */
export async function GET() {
  const sb = supabaseServer();
  if (!sb) return NextResponse.json(freeEntitlements()); // demo mode
  const { data } = await sb.auth.getUser();
  const email = data.user?.email ?? null;
  if (!email) return NextResponse.json(freeEntitlements());
  return NextResponse.json(await getEntitlementsForEmail(email));
}
