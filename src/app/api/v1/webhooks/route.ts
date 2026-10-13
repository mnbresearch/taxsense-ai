import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok, readJson } from "@/lib/api/respond";
import { createWebhook, publicWebhook } from "@/lib/api/webhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute("webhooks:manage", async (_req, ctx, rid) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  return ok({ items: (await ctx.store.listWebhooks(u.userId)).map(publicWebhook) }, rid);
});

/** Register an https endpoint. Returns the signing secret ONCE. */
export const POST = apiRoute("webhooks:manage", async (req, ctx, rid) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const b = await readJson(req, 10_000, rid);
  if (!b.ok) return b.res;
  const r = await createWebhook(ctx.store, u.userId, b.body as { url?: unknown; events?: unknown });
  if (!r.ok) return fail(r.code, r.message, rid, r.code === "unavailable" ? 503 : r.code === "conflict" ? 409 : 400);
  return ok({ ...publicWebhook(r.endpoint), signingSecret: r.secret }, rid, { status: 201 });
});
