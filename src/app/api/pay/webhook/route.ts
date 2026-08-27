import { NextRequest, NextResponse } from "next/server";
import { verifyCashfreeWebhook } from "@/lib/cashfree";
import { fulfillPaidOrder } from "@/lib/fulfill";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Batch 82 — Cashfree webhook receiver.
 * The RAW body string is read FIRST and used byte-for-byte for the HMAC;
 * the millisecond-timestamp normalisation lives in verifyCashfreeWebhook.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verdict = verifyCashfreeWebhook({
    rawBody,
    timestamp: req.headers.get("x-webhook-timestamp"),
    signature: req.headers.get("x-webhook-signature"),
    secret: process.env.CASHFREE_CLIENT_SECRET,
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 401 });

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = String(payload?.type ?? "");
  const order = payload?.data?.order ?? {};
  const payment = payload?.data?.payment ?? {};
  const customer = payload?.data?.customer_details ?? {};
  const orderId = String(order.order_id ?? "");
  const email = String(customer.customer_email ?? "").toLowerCase();
  const planKey = String(order.order_tags?.plan ?? order.order_note ?? "");

  if (type === "PAYMENT_SUCCESS_WEBHOOK" && payment?.payment_status === "SUCCESS" && orderId && email) {
    const res = await fulfillPaidOrder({
      orderId, email, planKey,
      amount: Number(order.order_amount) || undefined,
      cfPaymentId: payment.cf_payment_id ? String(payment.cf_payment_id) : undefined,
      via: "webhook",
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
    return NextResponse.json({ ok: true, duplicate: !!res.duplicate });
  }

  // Failures and everything else: acknowledge (2xx stops retries), audit failures.
  if (type === "PAYMENT_FAILED_WEBHOOK" && orderId) {
    const admin = supabaseAdmin();
    if (admin) {
      await admin.from("audit_events").insert({ event: "payment_failed", meta: { orderId, email, reason: payment?.payment_message ?? null } });
      try { await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId).neq("status", "paid"); } catch {}
    }
  }
  return NextResponse.json({ ok: true, ignored: type || "unknown" });
}
