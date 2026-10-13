import { NextResponse } from "next/server";
import { revokeKey } from "@/lib/api/keyService";
import { ERR_STATUS, auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Revoke immediately. */
export const DELETE = guarded(async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const k = /^[0-9a-f-]{36}$/i.test(id) ? await s.store.getKey(id).catch(() => null) : null;
  const r = await revokeKey(s.store, s.actor, id);
  if (!r.ok) return NextResponse.json({ error: r.err.message }, { status: ERR_STATUS[r.err.code] ?? 400 });
  await auditKeyEvent("api_key_revoked", s.actor.userId, { keyId: k?.key_id, kind: k?.kind });
  await track("api_key_revoked", { userId: s.actor.userId, props: { kind: k?.kind } });
  return NextResponse.json({ revoked: true });
});
