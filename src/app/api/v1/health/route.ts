import { NextResponse } from "next/server";
import { getApiStore } from "@/lib/api/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public integration health check (no auth). */
export async function GET() {
  const store = getApiStore();
  let keys: "ok" | "degraded" = "ok";
  try { await store.findKeyByKeyId("0000000000000000"); } catch { keys = "degraded"; }
  return NextResponse.json(
    { status: keys === "ok" ? "ok" : "degraded", apiVersion: "v1", components: { keyStore: keys, storage: store.mode }, time: new Date().toISOString() },
    { status: keys === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
