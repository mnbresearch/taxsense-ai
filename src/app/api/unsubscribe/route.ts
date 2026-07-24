import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unsubToken } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch 50 — one-click unsubscribe. Valid HMAC → suppression list. */
export async function GET(req: NextRequest) {
  const e = (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const valid = e && t && unsubToken(e) === t;
  if (valid) {
    const admin = supabaseAdmin();
    if (admin) await admin.from("email_suppressions").upsert({ email: e, reason: "unsubscribed" });
  }
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:80px auto;text-align:center;padding:0 16px;">
    <div style="background:#083c30;border-radius:14px 14px 0 0;padding:20px;"><span style="color:#fff;font-size:18px;font-weight:700;">TaxSense <span style="color:#d6ede1;font-weight:400;">AI</span></span></div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 14px 14px;padding:32px;">
      ${valid
        ? `<h1 style="font-size:20px;color:#1c1917;margin:0 0 10px;">You're unsubscribed</h1>
           <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0;">No more update emails to <strong>${e.replace(/</g, "&lt;")}</strong>. Deadline reminders you explicitly subscribed to are managed separately. Changed your mind? Just reply to any past email.</p>`
        : `<h1 style="font-size:20px;color:#1c1917;margin:0 0 10px;">That link didn't check out</h1>
           <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0;">The unsubscribe link looks incomplete or altered. Use the link from the bottom of the email, or reply to the email and we'll do it by hand.</p>`}
    </div>
    <p style="color:#a8a29e;font-size:11px;margin-top:14px;">TaxSense AI — by <a href="https://mnbresearch.com" style="color:#78716c;">MNB Research</a></p>
  </div></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
