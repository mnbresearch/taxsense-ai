/**
 * Access-request email flow via Resend (batch 11).
 *
 * SECURITY: RESEND_API_KEY lives ONLY in a server-side env var (Vercel →
 * Project → Settings → Environment Variables). This module is imported
 * exclusively from API routes (runtime: nodejs) — never from client code.
 *
 * Fire-and-forget by contract: every entry point swallows all errors so a
 * mail failure can never block or break the app UI.
 */

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "AbroBot <hello@updates.mnbresearch.com>";
const REPLY_TO = "mnbgotyou@gmail.com";
const ADMIN_EMAIL = "mnbgotyou@gmail.com";
const APP_NAME = "TaxSense AI";
const CONTACT_LINE = "AbroBot · MNB Research · +91 97114 88480 · abrobot.ai";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Shared branded shell (TaxSense green, inline styles for email clients). */
function shell(title: string, body: string): string {
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

async function sendOne(payload: { to: string[]; subject: string; html: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // not configured — silently no-op
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, ...payload }),
  });
  if (!res.ok) console.error("resend error", res.status, (await res.text()).slice(0, 200));
}

export type AccessRequestInfo = {
  email: string;
  name?: string;
  source?: string; // "hero" | "landing" | "login" | ...
  extra?: Record<string, string | undefined>;
};

/**
 * Sends both emails (admin notification + requester confirmation).
 * Never throws; awaits internally via allSettled so serverless doesn't kill it,
 * but callers may also choose not to await.
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
    const adminHtml = shell(
      "New access request",
      `<p style="color:#44403c;font-size:14px;">Someone just requested access to <strong>${APP_NAME}</strong>.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
         ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#78716c;width:120px;border-bottom:1px solid #f5f5f4;">${esc(k)}</td><td style="padding:7px 0;color:#1c1917;font-weight:600;border-bottom:1px solid #f5f5f4;">${esc(v)}</td></tr>`).join("")}
       </table>
       <p style="margin-top:16px;"><a href="https://taxsense-ai.vercel.app/admin" style="color:#0d5947;font-weight:600;">Open the admin panel →</a></p>`
    );

    const requesterHtml = shell(
      `Thanks${name ? ", " + esc(name.split(" ")[0]) : ""} — request received ✓`,
      `<p style="color:#44403c;font-size:14px;line-height:1.6;">Your request for access to <strong>${APP_NAME}</strong> is in. The team will review it and get back to you soon — access details land in this inbox at launch.</p>
       <p style="color:#44403c;font-size:14px;line-height:1.6;">Meanwhile, you can already explore the live demo:</p>
       <p style="margin:18px 0;"><a href="https://taxsense-ai.vercel.app/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Try TaxSense AI →</a></p>
       <p style="color:#78716c;font-size:12px;line-height:1.6;">Questions? Just reply to this email.<br/>${CONTACT_LINE}</p>`
    );

    await Promise.allSettled([
      sendOne({ to: [ADMIN_EMAIL], subject: `New access request — ${APP_NAME}: ${who}`, html: adminHtml }),
      sendOne({ to: [email], subject: "We received your access request", html: requesterHtml }),
    ]);
  } catch (e) {
    console.error("sendAccessRequestEmails failed", e);
  }
}
