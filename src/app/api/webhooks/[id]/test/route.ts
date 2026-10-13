import { NextResponse } from "next/server";
import { sendTestEvent } from "@/lib/api/webhookService";
import { sessionActor } from "@/lib/api/session";
import { guarded } from "@/lib/api/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = guarded(async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionActor(); if (!s.ok) return s.res;
  const { id } = await params;
  const ep = await s.store.getWebhook(s.actor.userId, id).catch(() => null);
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await sendTestEvent(s.store, ep));
});
