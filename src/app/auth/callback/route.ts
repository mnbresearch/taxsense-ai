import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Magic-link / OAuth code exchange for Supabase auth. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = supabaseServer();
    if (sb) await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/app", url.origin));
}
