import { NextRequest, NextResponse } from "next/server";
import { demoEvents, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { clientKey, rateLimitShared } from "@/lib/rateLimit";
import { CLIENT_EVENTS, cleanAnonId, cleanPath, isEventName, sanitizeProps } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * First-party telemetry: client errors, page views and a closed list of
 * product events. No PII: paths without query strings, whitelisted props,
 * a random per-browser id (anonId). The browser skips this entirely when
 * Global Privacy Control / Do Not Track is on or the user opted out.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimitShared(`tel:${clientKey(req)}`, 30, 60, { capacity: 30, refillPerMinute: 30 });
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  let b: { type?: unknown; event?: unknown; message?: unknown; path?: unknown; anonId?: unknown; props?: unknown; referrer?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const t = String(b.type ?? "unknown").slice(0, 40);
  const sb = supabaseAdmin(); // service role — no anon insert policy by design
  const anonId = cleanAnonId(b.anonId);

  if (t === "pageview" || t === "event") {
    const event = t === "pageview" ? "page_view" : b.event;
    if (!isEventName(event) || !CLIENT_EVENTS.includes(event)) return NextResponse.json({ ok: false }, { status: 400 });
    const path = cleanPath(b.path);
    if (t === "pageview" && !path) return NextResponse.json({ ok: false }, { status: 400 });
    let referrerHost: string | undefined;
    try { const h = new URL(String(b.referrer ?? "")).host; if (h && !h.endsWith("mnbresearch.com")) referrerHost = h; } catch { /* none */ }
    const props = sanitizeProps(event, { ...(typeof b.props === "object" && b.props ? b.props : {}), ...(referrerHost ? { referrer_host: referrerHost } : {}) });
    if (!sb) { demoEvents.push({ event, at: new Date().toISOString() }); return NextResponse.json({ ok: true }); }
    // Link to the signed-in account when there is one (identity linking).
    let userId: string | null = null;
    try { const s = await supabaseServer(); userId = (await s?.auth.getUser())?.data.user?.id ?? null; } catch { userId = null; }
    const { error } = await sb.from("product_events").insert({ event, anon_id: anonId, user_id: userId, source: "web", path, props });
    // Before migration 0014: keep the old page-view counter working.
    if (error && event === "page_view") await sb.from("audit_events").insert({ event: "pageview", meta: { path } });
    return NextResponse.json({ ok: true });
  }

  // Legacy product events + client errors (PII-free).
  const event = ["guide_complete", "share_created", "feedback_up", "feedback_down"].includes(t) ? t : `client_error:${t}`;
  const meta = { message: String(b.message ?? "").slice(0, 300) };
  if (sb) await sb.from("audit_events").insert({ event, meta });
  else demoEvents.push({ event, at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
