import { NextRequest, NextResponse } from "next/server";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";
import { supabaseAdmin } from "@/lib/supabase/server";

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

  // 4. Log the run so the admin panel can display "last keep-alive"
  try {
    await sb.from("audit_events").insert({ event: "cron_keepalive", meta: out });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json(out);
}
