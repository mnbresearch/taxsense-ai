import { NextResponse } from "next/server";
import { createWebhook, publicWebhook } from "@/lib/api/webhookService";
import { ERR_STATUS, auditKeyEvent, sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = guarded(async function GET() {
  const s = await sessionActor(); if (!s.ok) return s.res;
  return NextResponse.json({ endpoints: (await s.store.listWebhooks(s.actor.userId)).map(publicWebhook) }, { headers: { "cache-control": "no-store" } });
});

export const POST = guarded(async function POST(req: Request) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const body = await req.json().catch(() => ({}));
  const r = await createWebhook(s.store, s.actor.userId, body);
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: ERR_STATUS[r.code] ?? 400 });
  await auditKeyEvent("webhook_endpoint_created", s.actor.userId, { endpointId: r.endpoint.id, host: new URL(r.endpoint.url).host, events: r.endpoint.events });
  await track("webhook_endpoint_created", { userId: s.actor.userId });
  return NextResponse.json({ endpoint: publicWebhook(r.endpoint), signingSecret: r.secret }, { status: 201, headers: { "cache-control": "no-store" } });
});
