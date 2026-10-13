import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/respond";
import { sendTestEvent } from "@/lib/api/webhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Send a signed `webhook.test` event now and report the outcome. */
export const POST = apiRoute<{ id: string }>("webhooks:manage", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const ep = UUID.test(id) ? await ctx.store.getWebhook(u.userId, id) : null;
  if (!ep) return fail("not_found", "Webhook endpoint not found.", rid, 404);
  return ok(await sendTestEvent(ctx.store, ep), rid);
});
