import { apiRoute } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { keyStatus } from "@/lib/api/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Introspect the calling key (any valid key, no scope needed). */
export const GET = apiRoute(null, async (_req, ctx, rid) => {
  const k = ctx.key;
  return ok({ keyId: k.key_id, name: k.name, kind: k.kind, scopes: k.scopes, status: keyStatus(k), expiresAt: k.expires_at, rateLimits: ctx.limits }, rid);
});
