import { NextRequest, NextResponse } from "next/server";
import { quickCheck } from "@/lib/taxcheck";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_EMAIL, brandedShell, sendOne } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Batch 93 — landing lead magnet: full report to the lead, lead to the founder. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`taxcheck:${clientKey(req)}`, { capacity: 5, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ error: "too many attempts — try again in a minute" }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").replace(/[^\d]/g, "").slice(-10);
  const income = Number(b.income) || 0;
  const rentMonthly = Number(b.rentMonthly) || 0;
  const ded80C = Number(b.ded80C) || 0;
  const metro = !!b.metro;
  const currentRegime = ["new", "old", "unsure"].includes(b.currentRegime) ? b.currentRegime : "unsure";

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "valid 10-digit mobile required" }, { status: 400 });
  if (income < 100000 || income > 100_000_000) return NextResponse.json({ error: "income out of range" }, { status: 400 });

  const r = quickCheck({ income, rentMonthly, metro, ded80C, currentRegime });

  // Lead into the admin panel (best-effort).
  const admin = supabaseAdmin();
  if (admin) {
    const row = { email, name, phone, source: "tax-check" };
    const { error } = await admin.from("access_requests").insert(row);
    if (error) await admin.from("access_requests").update({ phone, name }).eq("email", email).eq("status", "lead");
    await admin.from("audit_events").insert({ event: "tax_check_lead", meta: { email, income, opportunity: r.totalOpportunity } });
  }

  const first = name.split(" ")[0];
  await Promise.allSettled([
    sendOne({
      to: ADMIN_EMAIL,
      subject: `🔥 Tax-Check lead: ${name} · ${inr(income)} · opportunity ${inr(r.totalOpportunity)}`,
      kind: "admin_notify",
      html: brandedShell(
        "New Tax-Check lead",
        `<table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${[["Name", name], ["Email", email], ["Phone", "+91 " + phone], ["Income", inr(income)], ["Rent", inr(rentMonthly) + "/mo" + (metro ? " (metro)" : "")], ["80C so far", inr(ded80C)], ["Files under", currentRegime], ["Old regime tax", inr(r.oldTax)], ["New regime tax", inr(r.newTax)], ["Overpaying now", inr(r.overpayingNow)], ["With 2 moves", inr(r.movesSaving)], ["TOTAL opportunity", inr(r.totalOpportunity)]]
            .map(([k, v]) => `<tr><td style="padding:6px 0;color:#78716c;width:140px;border-bottom:1px solid #f5f5f4;">${k}</td><td style="padding:6px 0;color:#1c1917;font-weight:600;border-bottom:1px solid #f5f5f4;">${v}</td></tr>`).join("")}
        </table>
        <p style="margin-top:14px;"><a href="tel:+91${phone}" style="color:#0d5947;font-weight:700;">📞 Call ${first}</a> &nbsp;·&nbsp; <a href="https://taxsense.mnbresearch.com/admin" style="color:#0d5947;font-weight:600;">Open admin →</a></p>`
      ),
    }),
    sendOne({
      to: email,
      subject: `${first}, your 60-second Tax Check: ${r.totalOpportunity > 0 ? inr(r.totalOpportunity) + " on the table" : "you're well optimised"}`,
      kind: "confirmation",
      html: brandedShell(
        `Your Tax Check results, ${first}`,
        `<table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:7px 0;color:#78716c;">Old regime</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#1c1917;">${inr(r.oldTax)}</td></tr>
          <tr><td style="padding:7px 0;color:#78716c;">New regime</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#1c1917;">${inr(r.newTax)}</td></tr>
          <tr><td style="padding:7px 0;color:#0d5947;font-weight:700;">Better for you</td><td style="padding:7px 0;text-align:right;font-weight:800;color:#0d5947;">${r.recommended.toUpperCase()} — ${inr(r.bestTax)}</td></tr>
        </table>
        ${r.overpayingNow > 0 ? `<p style="background:#fef3c7;border-radius:8px;padding:10px 14px;color:#92400e;font-size:14px;">You indicated you file under the <strong>${currentRegime}</strong> regime — that's <strong>${inr(r.overpayingNow)}/yr more</strong> than the better option.</p>` : ""}
        ${r.movesSaving > 0 ? `<p style="color:#44403c;font-size:14px;line-height:1.6;">Two standard moves (topping 80C to ₹1.5L + ₹50k NPS u/s 80CCD(1B)) would cut another <strong>${inr(r.movesSaving)}</strong> — see the exact ranked list in your workspace.</p>` : ""}
        <p style="margin:18px 0;"><a href="https://taxsense.mnbresearch.com/app" style="background:#0d5947;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px;display:inline-block;">Get my full ranked savings plan →</a></p>
        <p style="color:#78716c;font-size:12px;line-height:1.6;">Estimates from the numbers you entered (typical salary structure assumed) — 3 minutes in the workspace makes them exact. The team may reach out on +91 ${phone} to help. Browse the <a href="https://taxsense.mnbresearch.com/playbook" style="color:#0d5947;font-weight:600;">Tax-Saving Playbook</a> meanwhile.</p>`
      ),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
