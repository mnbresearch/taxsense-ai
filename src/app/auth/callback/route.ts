import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { sendAccessRequestEmails } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Magic-link / OAuth code exchange for Supabase auth.
 * Batch 11: on FIRST-time sign-in, also records the user as an access
 * request (source "login") and fires the admin-notify + welcome emails.
 * The unique index on access_requests(lower(email)) makes this idempotent —
 * returning users produce a duplicate error and no email.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = supabaseServer();
    if (sb) {
      try {
        const { data } = await sb.auth.exchangeCodeForSession(code);
        const user = data?.user;
        const email = user?.email?.toLowerCase();
        if (user && email) {
          const admin = supabaseAdmin();
          if (admin) {
            const name = (user.user_metadata?.full_name as string | undefined) ?? undefined;
            const { error } = await admin
              .from("access_requests")
              .insert({ email, name: name ?? null, source: "login" });
            if (!error) {
              // first time we've ever seen this email → notify + welcome
              await sendAccessRequestEmails({ email, name, source: "login" });
            }
          }
        }
      } catch (e) {
        console.error("auth callback email hook failed", e);
      }
    }
  }
  return NextResponse.redirect(new URL("/app", url.origin));
}
