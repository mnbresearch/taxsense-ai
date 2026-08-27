import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cashfreeConfigured, cashfreeMode, createCashfreeOrder, PAY_CATALOG } from "@/lib/cashfree";
import { supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Batch 82 — is online payment live? (Also lets the UI degrade gracefully.) */
export async function GET() {
  return NextResponse.json({ enabled: cashfreeConfigured(), mode: cashfreeMode() });
}

/** Create a Cashfree order for a catalog plan. Amounts are server-side only. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`payorder:${clientKey(req)}`, { capacity: 6, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ error: "too many attempts — wait a minute" }, { status: 429 });
  if (!cashfreeConfigured())
    return NextResponse.json({ enabled: false, error: "Online payment isn't live yet — use Request and we'll set you up personally." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const planKey = typeof body.planKey === "string" ? body.planKey : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phoneRaw = typeof body.phone === "string" ? body.phone.replace(/[^\d]/g, "") : "";
  const phone = phoneRaw.length > 10 ? phoneRaw.slice(-10) : phoneRaw;

  const cat = PAY_CATALOG[planKey];
  if (!cat) return NextResponse.json({ error: "unknown plan" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "valid 10-digit Indian mobile required" }, { status: 400 });

  const orderId = `ts_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const origin = req.nextUrl.origin;
  const created = await createCashfreeOrder({
    orderId, amount: cat.amount, email, phone, name, planKey,
    returnUrl: `${origin}/pay/return?order_id=${orderId}`,
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 502 });

  // Make the lead visible to the admin panel immediately (best-effort).
  const admin = supabaseAdmin();
  if (admin) {
    const row = { email, name: name || null, phone: phone || null, source: "pay-online", plan: cat.planLabel };
    const { error } = await admin.from("access_requests").insert(row);
    if (error) await admin.from("access_requests").update({ plan: cat.planLabel }).eq("email", email).eq("status", "lead");
    await admin.from("audit_events").insert({ event: "pay_order_created", meta: { email, orderId, planKey, amount: cat.amount } });
    try { await admin.from("payments").insert({ order_id: orderId, email, plan_key: planKey, amount: cat.amount, status: "created", via: "checkout" }); } catch {}
  }

  return NextResponse.json({ enabled: true, orderId, paymentSessionId: created.paymentSessionId, mode: cashfreeMode() });
}
