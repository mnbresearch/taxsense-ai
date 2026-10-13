import { NextResponse } from "next/server";
import { publicWebhook } from "@/lib/api/webhookService";
import { auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = guarded(async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const ep = await s.store.getWebhook(s.actor.userId, id).catch(() => null);
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const deliveries = (await s.store.listDeliveries(id, 20)).map((d) => ({ id: d.id, event: d.event, status: d.status, attempts: d.attempts, lastStatus: d.last_status, lastError: d.last_error, createdAt: d.created_at }));
  return NextResponse.json({ endpoint: publicWebhook(ep), deliveries });
});

export const DELETE = guarded(async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const okDel = await s.store.deleteWebhook(s.actor.userId, id).catch(() => false);
  if (!okDel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await auditKeyEvent("webhook_endpoint_deleted", s.actor.userId, { endpointId: id });
  return NextResponse.json({ deleted: true });
});
