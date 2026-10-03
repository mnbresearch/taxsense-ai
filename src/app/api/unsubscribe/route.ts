import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyUnsubToken } from "@/lib/email";
import { escHtml } from "@/lib/html";
import { clientKey, rateLimitShared } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsubscribe.
 *  GET  → confirmation page with a button (mail scanners that prefetch links
 *         can't silently unsubscribe anyone).
 *  POST → performs it. Also the RFC 8058 one-click target used by Gmail/Yahoo
 *         via the List-Unsubscribe-Post header.
 * Unsubscribing stops ALL non-essential mail: campaigns, digests and deadline reminders.
 */
function page(title: string, body: string, status = 200) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · TaxSense AI</title></head><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:80px auto;text-align:center;padding:0 16px;">
    <div style="background:#083c30;border-radius:14px 14px 0 0;padding:20px;"><span style="color:#fff;font-size:18px;font-weight:700;">TaxSense <span style="color:#d6ede1;font-weight:400;">AI</span></span></div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 14px 14px;padding:32px;">
      <h1 style="font-size:20px;color:#1c1917;margin:0 0 10px;">${title}</h1>${body}
    </div>
    <p style="color:#a8a29e;font-size:11px;margin-top:14px;">TaxSense AI — by MNB Research</p>
  </div></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
const p = (t: string) => `<p style="color:#57534e;font-size:14px;line-height:1.6;margin:0;">${t}</p>`;
const BAD = () =>
  page("That link didn't check out", p("The unsubscribe link looks incomplete or altered. Use the link at the bottom of the email, or reply to it and we'll remove you by hand."), 400);

function params(req: NextRequest) {
  return {
    e: (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase().slice(0, 120),
    t: (req.nextUrl.searchParams.get("t") ?? "").slice(0, 64),
  };
}

export async function GET(req: NextRequest) {
  const { e, t } = params(req);
  if (!verifyUnsubToken(e, t)) return BAD();
  const action = `/api/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`;
  return page(
    "Unsubscribe?",
    p(`Stop all update emails and deadline reminders to <strong>${escHtml(e)}</strong>?`) +
      `<form method="POST" action="${escHtml(action)}" style="margin-top:20px;"><button type="submit" style="background:#0d5947;color:#fff;border:0;border-radius:8px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer;">Yes, unsubscribe me</button></form>`
  );
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitShared(`unsub:${clientKey(req)}`, 20, 60, { capacity: 20, refillPerMinute: 10 });
  if (!rl.allowed) return page("Slow down", p("Too many requests — try again in a minute."), 429);
  const { e, t } = params(req);
  if (!verifyUnsubToken(e, t)) return BAD();
  const admin = supabaseAdmin();
  if (admin) {
    const sup = await admin.from("email_suppressions").upsert({ email: e, reason: "unsubscribed" });
    await admin.from("tax_reminders").update({ active: false }).eq("email", e);
    if (sup.error) {
      console.error("unsubscribe failed", sup.error.message);
      return page("Something went wrong", p("We couldn't save that just now. Reply to any of our emails with STOP and we'll remove you by hand."), 500);
    }
  }
  return page("You're unsubscribed", p(`No more update emails or reminders to <strong>${escHtml(e)}</strong>. Sign-in codes and payment receipts still arrive because you asked for them. Changed your mind? Just reply to any past email.`));
}
