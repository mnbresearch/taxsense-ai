/**
 * Email engine — Resend transactional + campaign sends (batches 11–12).
 *
 * SECURITY: RESEND_API_KEY lives ONLY in a server-side env var (Vercel →
 * Project → Settings → Environment Variables). This module is imported
 * exclusively from API routes (runtime: nodejs) — never from client code.
 *
 * Every send (or skip/failure) is recorded in public.email_log so the admin
 * panel can show exactly who got what. All entry points swallow errors —
 * a mail failure can never block or break the app UI.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "AbroBot <hello@updates.mnbresearch.com>";
const REPLY_TO = "mnbgotyou@gmail.com";
export const ADMIN_EMAIL = "mnbgotyou@gmail.com";
const APP_NAME = "TaxSense AI";
const CONTACT_LINE = "AbroBot · MNB Research · +91 97114 88480 · abrobot.ai";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailKind = "admin_notify" | "confirmation" | "welcome" | "custom";
export type SendResult = { to: string; ok: boolean; error?: string };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Shared branded shell (TaxSense green, inline styles for email clients). */
export function brandedShell(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#083c30;border-radius:14px 14px 0 0;padding:22px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">TaxSense <span style="color:#d6ede1;font-weight:400;">AI</span></span>
      <span style="color:#d6ede1;font-size:12px;float:right;padding-top:4px;">an MNB Research product</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 14px 14px;padding:28px;">
      <h1 style="margin:0 0 14px;font-size:20px;color:#1c1917;">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#a8a29e;font-size:11px;margin-top:16px;">${CONTACT_LINE}</p>
  </div>
</body></html>`;
}

async function logEmail(entry: { to_email: string; subject: string; kind: EmailKind; status: "sent" | "failed" | "skipped"; error?: string; track_id?: string; template_name?: string | null }): Promise<void> {
  try {
    const sb = supabaseAdmin();
    if (sb) await sb.from("email_log").insert(entry);
  } catch (e) {
    console.error("email_log insert failed", e);
  }
}

/** Sends one email via Resend and logs the outcome. Never throws. */
const SITE = "https://taxsense-ai.vercel.app";

export async function sendOne(payload: { to: string; subject: string; html: string; kind: EmailKind; trackId?: string; templateName?: string | null }): Promise<SendResult> {
  const { to, subject, html, kind, trackId, templateName } = payload;
  const meta = trackId ? { track_id: trackId, template_name: templateName ?? null } : {};
  try {
    if (!EMAIL_RE.test(to)) {
      return { to, ok: false, error: "invalid email" };
    }
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      await logEmail({ to_email: to, subject, kind, status: "skipped", error: "RESEND_API_KEY not configured", ...meta });
      return { to, ok: false, error: "RESEND_API_KEY not configured" };
    }
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = (await res.text()).slice(0, 300);
      console.error("resend error", res.status, err);
      await logEmail({ to_email: to, subject, kind, status: "failed", error: `${res.status}: ${err}`, ...meta });
      return { to, ok: false, error: `resend ${res.status}` };
    }
    await logEmail({ to_email: to, subject, kind, status: "sent", ...meta });
    return { to, ok: true };
  } catch (e: any) {
    await logEmail({ to_email: to, subject, kind, status: "failed", error: String(e).slice(0, 300), ...meta });
    return { to, ok: false, error: String(e).slice(0, 120) };
  }
}

export type AccessRequestInfo = {
  email: string;
  name?: string;
  source?: string; // "hero" | "landing" | "login" | ...
  extra?: Record<string, string | undefined>;
};

/**
 * Access-request flow: admin notification + requester confirmation.
 * Never throws; awaits internally so serverless doesn't kill the sends.
 */
export async function sendAccessRequestEmails(info: AccessRequestInfo): Promise<void> {
  try {
    const email = info.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    const name = (info.name ?? "").trim();
    const who = name || email;
    const ts = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

    const rows: [string, string][] = [
      ["Name", name || "—"],
      ["Email", email],
      ["App", APP_NAME],
      ["Source", info.source ?? "landing"],
      ["Time (IST)", ts],
      ...Object.entries(info.extra ?? {}).filter((e): e is [string, string] => !!e[1]),
    ];
    const adminHtml = brandedShell(
      "New access request",
      `<p style="color:#44403c;font-size:14px;">Someone just requested access to <strong>${APP_NAME}</strong>.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
         ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#78716c;width:120px;border-bottom:1px solid #f5f5f4;">${esc(k)}</td><td style="padding:7px 0;color:#1c1917;font-weight:600;border-bottom:1px solid #f5f5f4;">${esc(v)}</td></tr>`).join("")}
       </table>
       <p style="margin-top:16px;"><a href="https://taxsense-ai.vercel.app/admin" style="color:#0d5947;font-weight:600;">Open the admin panel →</a></p>`
    );

    const plan = info.extra?.Plan;
    const requesterHtml = brandedShell(
      `Thanks${name ? ", " + esc(name.split(" ")[0]) : ""} — request received ✓`,
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">${
        plan
          ? `Your request for the <strong>${esc(plan)}</strong> plan on <strong>${APP_NAME}</strong> is in. The team will contact you shortly${info.extra?.Phone ? " on the number you shared" : ""} to complete your setup and payment.`
          : `Your request for access to <strong>${APP_NAME}</strong> is in. The team will review it and get back to you soon — access details land in this inbox at launch.`
      }</p>
       <p style="color:#44403c;font-size:14px;line-height:1.6;">Meanwhile, you can already explore the live demo:</p>
       <p style="margin:18px 0;"><a href="https://taxsense-ai.vercel.app/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Try TaxSense AI →</a></p>
       <p style="color:#78716c;font-size:12px;line-height:1.6;">Questions? Just reply to this email.<br/>${CONTACT_LINE}</p>`
    );

    await Promise.allSettled([
      sendOne({ to: ADMIN_EMAIL, subject: `New access request — ${APP_NAME}: ${who}`, html: adminHtml, kind: "admin_notify" }),
      sendOne({ to: email, subject: "We received your access request", html: requesterHtml, kind: "confirmation" }),
    ]);
  } catch (e) {
    console.error("sendAccessRequestEmails failed", e);
  }
}

/**
 * Campaign send (admin composer). Plain-text body → branded HTML paragraphs.
 * Supports {name} personalisation. Sends sequentially (Resend rate ~2 rps)
 * and returns a per-recipient result list. Never throws.
 */
export async function sendCampaign(opts: {
  subject: string;
  body: string;
  recipients: { email: string; name?: string | null }[];
  /** Batch 48 — attributes sends to a template for open-rate analytics. */
  templateName?: string | null;
}): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const seen = new Set<string>();
  for (const r of opts.recipients) {
    const email = r.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    const first = (r.name ?? "").trim().split(" ")[0];
    const personalBody = opts.body.replace(/\{name\}/g, first || "there");
    const personalSubject = opts.subject.replace(/\{name\}/g, first || "there");
    const paragraphs = personalBody
      .split(/\n{2,}/)
      .map((p) => `<p style="color:#44403c;font-size:14.5px;line-height:1.7;margin:0 0 14px;">${esc(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");
    // Batch 48 — open tracking: unguessable pixel per send.
    const trackId = crypto.randomUUID();
    const html = brandedShell(
      esc(personalSubject),
      `${paragraphs}
       <p style="color:#78716c;font-size:12px;line-height:1.6;margin-top:20px;">Questions? Just reply to this email.<br/>${CONTACT_LINE}</p>
       <img src="${SITE}/api/e/o/${trackId}" width="1" height="1" alt="" style="display:block;" />`
    );
    results.push(await sendOne({ to: email, subject: personalSubject, html, kind: "custom", trackId, templateName: opts.templateName ?? null }));
  }
  return results;
}
