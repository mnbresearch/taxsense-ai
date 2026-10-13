import { NextResponse } from "next/server";
import { rotateKey } from "@/lib/api/keyService";
import { ERR_STATUS, auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rotate (overlapHours 0 = regenerate now; up to 24h overlap). New secret returned ONCE. */
export const POST = guarded(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { overlapHours?: unknown };
  const r = await rotateKey(s.store, s.actor, id, body?.overlapHours);
  if (!r.ok) return NextResponse.json({ error: r.err.message }, { status: ERR_STATUS[r.err.code] ?? 400 });
  await auditKeyEvent("api_key_rotated", s.actor.userId, { newKeyId: r.key.key_id, rotatedFrom: id, oldKeyRetiresAt: r.oldKeyRetiresAt });
  await track("api_key_rotated", { userId: s.actor.userId, props: { kind: r.key.kind } });
  return NextResponse.json({ key: r.key, secret: r.secret, oldKeyRetiresAt: r.oldKeyRetiresAt }, { headers: { "cache-control": "no-store" } });
});
