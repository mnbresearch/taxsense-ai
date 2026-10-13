import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/respond";
import { publicWebhook } from "@/lib/api/webhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type P = { id: string };

/** Endpoint details + the 20 most recent deliveries. */
export const GET = apiRoute<P>("webhooks:manage", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const ep = UUID.test(id) ? await ctx.store.getWebhook(u.userId, id) : null;
  if (!ep) return fail("not_found", "Webhook endpoint not found.", rid, 404);
  const deliveries = (await ctx.store.listDeliveries(ep.id, 20)).map((d) => ({
    id: d.id, event: d.event, status: d.status, attempts: d.attempts, lastStatus: d.last_status, lastError: d.last_error, createdAt: d.created_at, deliveredAt: d.delivered_at,
  }));
  return ok({ ...publicWebhook(ep), deliveries }, rid);
});

export const DELETE = apiRoute<P>("webhooks:manage", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  if (!UUID.test(id) || !(await ctx.store.deleteWebhook(u.userId, id))) return fail("not_found", "Webhook endpoint not found.", rid, 404);
  return ok({ id, deleted: true }, rid);
});
