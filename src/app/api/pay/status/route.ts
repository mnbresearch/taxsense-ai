import { NextRequest, NextResponse } from "next/server";
import { cashfreeConfigured, getCashfreeOrder } from "@/lib/cashfree";
import { fulfillPaidOrder } from "@/lib/fulfill";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Batch 82 — server-verified order status for the return page.
 * Never trusts the client: asks Cashfree directly, and doubles as the
 * fulfilment fallback if a webhook is delayed or unregistered (idempotent).
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(`paystatus:${clientKey(req)}`, { capacity: 30, refillPerMinute: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  if (!cashfreeConfigured()) return NextResponse.json({ error: "payments not configured" }, { status: 503 });

  const orderId = req.nextUrl.searchParams.get("order_id")?.slice(0, 64) ?? "";
  if (!/^ts_[a-z0-9]+$/i.test(orderId)) return NextResponse.json({ error: "bad order id" }, { status: 400 });

  const order = await getCashfreeOrder(orderId);
  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });

  const status = String(order.order_status ?? "UNKNOWN"); // ACTIVE | PAID | EXPIRED | ...
  const email = String(order.customer_details?.customer_email ?? "").toLowerCase();
  const planKey = String(order.order_tags?.plan ?? order.order_note ?? "");

  if (status === "PAID" && email) {
    await fulfillPaidOrder({ orderId, email, planKey, amount: Number(order.order_amount) || undefined, via: "status-poll" });
  }

  return NextResponse.json({ status, planKey, email: email ? email.replace(/(.{2}).*(@.*)/, "$1…$2") : null });
}
