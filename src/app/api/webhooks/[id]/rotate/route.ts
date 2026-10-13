import { NextResponse } from "next/server";
import { rotateWebhookSecret } from "@/lib/api/webhookService";
import { auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = guarded(async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const r = await rotateWebhookSecret(s.store, s.actor.userId, id).catch(() => null);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await auditKeyEvent("webhook_secret_rotated", s.actor.userId, { endpointId: id });
  return NextResponse.json({ signingSecret: r.secret }, { headers: { "cache-control": "no-store" } });
});
