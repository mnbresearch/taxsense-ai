import { NextRequest, NextResponse } from "next/server";

/**
 * Central CSRF guard for the API (Next 16 "proxy", formerly middleware).
 *
 * Cookie-authenticated, state-changing requests (POST/PUT/PATCH/DELETE) must
 * come from our own pages. Browsers always attach Origin (and Sec-Fetch-Site)
 * to such requests, so a cross-site form or fetch is rejected here before any
 * route code runs. Requests with no browser provenance headers (server-to-
 * server, curl) carry no victim cookies and are left to the routes' own auth.
 *
 * Exempt: payment webhook (HMAC-verified), cron (bearer secret) and one-click
 * unsubscribe (RFC 8058 — mail providers POST it from their own servers).
 */
const EXEMPT = [/^\/api\/pay\/webhook$/, /^\/api\/cron\//, /^\/api\/unsubscribe$/];
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(req: NextRequest) {
  if (SAFE.has(req.method)) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (EXEMPT.some((r) => r.test(path))) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* "null" or malformed */ }
    if (originHost !== host) return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
  } else if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "cross-site request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
