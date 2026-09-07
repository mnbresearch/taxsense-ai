import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Batch 95 — same-origin proxy for the Cashfree checkout SDK.
 * Ad-blockers block third-party scripts from *.cashfree.com; served from our
 * own domain the script always loads. The subsequent checkout is a top-level
 * navigation to payments.cashfree.com, which blockers do not intercept.
 */
export async function GET() {
  try {
    const res = await fetch("https://sdk.cashfree.com/js/v3/cashfree.js", { next: { revalidate: 3600 } });
    if (!res.ok) return new NextResponse("// sdk fetch failed", { status: 502, headers: { "content-type": "application/javascript" } });
    const js = await res.text();
    return new NextResponse(js, {
      status: 200,
      headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch {
    return new NextResponse("// sdk fetch failed", { status: 502, headers: { "content-type": "application/javascript" } });
  }
}
