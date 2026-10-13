import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/respond";
import { rotateWebhookSecret } from "@/lib/api/webhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Issue a new signing secret (old one stops working immediately). Returned ONCE. */
export const POST = apiRoute<{ id: string }>("webhooks:manage", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const r = UUID.test(id) ? await rotateWebhookSecret(ctx.store, u.userId, id) : null;
  if (!r) return fail("not_found", "Webhook endpoint not found.", rid, 404);
  return ok({ id, signingSecret: r.secret }, rid);
});
