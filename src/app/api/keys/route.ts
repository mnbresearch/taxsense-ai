import { NextRequest, NextResponse } from "next/server";
import { createKey, listKeys } from "@/lib/api/keyService";
import { ERR_STATUS, auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List your keys (metadata only). Admins: ?service=1 for MNB service keys. */
export const GET = guarded(async function GET(req: NextRequest) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const service = req.nextUrl.searchParams.get("service") === "1";
  if (service && !s.actor.isAdmin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json({ keys: await listKeys(s.store, s.actor, { service }) }, { headers: { "cache-control": "no-store" } });
});

/** Create a key. The full secret is in this response ONLY. */
export const POST = guarded(async function POST(req: NextRequest) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  const r = await createKey(s.store, s.actor, body);
  if (!r.ok) return NextResponse.json({ error: r.err.message }, { status: ERR_STATUS[r.err.code] ?? 400 });
  await auditKeyEvent("api_key_created", s.actor.userId, { keyId: r.key.key_id, kind: r.key.kind, scopes: r.key.scopes, expiresAt: r.key.expires_at });
  await track("api_key_created", { userId: s.actor.userId, props: { kind: r.key.kind } });
  return NextResponse.json({ key: r.key, secret: r.secret, warning: "Copy this key now — it will not be shown again." }, { status: 201, headers: { "cache-control": "no-store" } });
});
