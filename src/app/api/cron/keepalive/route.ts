import { NextRequest, NextResponse } from "next/server";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deadlinesInDays } from "@/lib/deadlines";
import { ADMIN_EMAIL, brandedShell, sendOne } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keep-alive + nightly ops (batch 14). Runs daily via Vercel Cron (vercel.json).
 *
 * 1. Touches the database so the Supabase free-tier project never pauses
 *    (free projects pause after ~7 days without activity).
 * 2. Runs the data-retention jobs that were previously manual:
 *    execute_pending_deletions() and purge_stale_intake_messages().
 * 3. Runs the tax-engine self-test and logs the run to audit_events, so the
 *    admin panel can show when the last keep-alive happened.
 *
 * Security: when CRON_SECRET is set in the environment, Vercel Cron sends
 * "Authorization: Bearer <CRON_SECRET>" automatically and we require it.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const out: Record<string, unknown> = { time: new Date().toISOString() };

  // 1. Engine self-test (₹12.75L anchor)
  const p = emptyProfile();
  p.salary = {
    grossSalary: 1_275_000, basicPlusDA: 637_500, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  };
  const c = computeBoth(p);
  out.engine = c.new.totalTaxLiability === 0 && c.old.totalTaxLiability === 187_200 ? "pass" : "FAIL";

  const sb = supabaseAdmin();
  if (!sb) {
    out.supabase = "demo-mode (nothing to keep alive)";
    return NextResponse.json(out);
  }

  // 2. DB keep-alive touch
  try {
    const { count, error } = await sb.from("access_requests").select("*", { count: "exact", head: true });
    out.dbTouch = error ? `error: ${error.message}` : `ok (${count} leads)`;
  } catch (e) {
    out.dbTouch = String(e).slice(0, 120);
  }

  // 3. Retention jobs (formerly the manual pg_cron runbook items)
  for (const fn of ["execute_pending_deletions", "purge_stale_intake_messages"] as const) {
    try {
      const { error } = await sb.rpc(fn);
      out[fn] = error ? `error: ${error.message}` : "ok";
    } catch (e) {
      out[fn] = String(e).slice(0, 120);
    }
  }

  // 4. Deadline reminder emails: D-7 and D-1 nudges to every active subscriber
  try {
    const due = [...deadlinesInDays(new Date(), 7).map((d) => ({ ...d, when: "in 7 days" })),
                 ...deadlinesInDays(new Date(), 1).map((d) => ({ ...d, when: "TOMORROW" }))];
    if (due.length > 0) {
      const { data: subs } = await sb.from("tax_reminders").select("email").eq("active", true).limit(1000);
      let sent = 0;
      for (const s of subs ?? []) {
        for (const dl of due) {
          const res = await sendOne({
            to: s.email,
            subject: `⏰ ${dl.label} — ${dl.when}`,
            kind: "custom",
            html: brandedShell(
              `${dl.label} is ${dl.when.toLowerCase()}`,
              `<p style="color:#44403c;font-size:14px;line-height:1.6;"><strong>${new Date(dl.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong> — ${dl.detail}</p>
               <p style="margin:18px 0;"><a href="https://taxsense-ai.vercel.app/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Compute what you owe →</a></p>
               <p style="color:#78716c;font-size:12px;">Reply STOP to stop reminders.</p>`
            ),
          });
          if (res.ok) sent++;
        }
      }
      out.reminders = `${due.length} deadline(s) due, ${sent} email(s) sent`;
    } else {
      out.reminders = "no deadlines in 7d/1d window";
    }
  } catch (e) {
    out.reminders = String(e).slice(0, 120);
  }

  // 5. Founder daily digest: last-24h activity straight to the admin inbox
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const cnt = async (table: string, extra?: (q: any) => any) => {
      let q: any = sb.from(table).select("*", { count: "exact", head: true }).gte("created_at", since);
      if (extra) q = extra(q);
      const { count } = await q;
      return count ?? 0;
    };
    const [leads24, plans24, emails24, subs24] = await Promise.all([
      cnt("access_requests"),
      cnt("access_requests", (q) => q.not("plan", "is", null)),
      cnt("email_log"),
      cnt("tax_reminders"),
    ]);
    if (leads24 + emails24 + subs24 > 0) {
      const row = (k: string, v: number) =>
        `<tr><td style="padding:7px 0;color:#78716c;border-bottom:1px solid #f5f5f4;">${k}</td><td style="padding:7px 0;color:#1c1917;font-weight:700;text-align:right;border-bottom:1px solid #f5f5f4;">${v}</td></tr>`;
      await sendOne({
        to: ADMIN_EMAIL,
        subject: `📊 TaxSense daily: ${leads24} lead${leads24 === 1 ? "" : "s"}${plans24 ? `, ${plans24} plan request${plans24 === 1 ? "" : "s"} 💰` : ""}`,
        kind: "admin_notify",
        html: brandedShell(
          "Your last 24 hours",
          `<table style="width:100%;border-collapse:collapse;font-size:14px;">
             ${row("New access requests", leads24)}${row("Plan requests (revenue!)", plans24)}${row("Emails sent by the system", emails24)}${row("New reminder subscribers", subs24)}
           </table>
           <p style="margin-top:16px;"><a href="https://taxsense-ai.vercel.app/admin" style="color:#0d5947;font-weight:600;">Open the admin panel →</a></p>`
        ),
      });
      out.digest = `sent (${leads24} leads, ${plans24} plans)`;
    } else {
      out.digest = "no activity in 24h — skipped";
    }
  } catch (e) {
    out.digest = String(e).slice(0, 120);
  }

  // 6. Log the run so the admin panel can display "last keep-alive"
  try {
    await sb.from("audit_events").insert({ event: "cron_keepalive", meta: out });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json(out);
}
