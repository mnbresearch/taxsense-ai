import { later } from "@/lib/api/later";
import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/respond";
import { publicProfile } from "@/lib/api/profiles";
import { emitWebhook } from "@/lib/api/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type P = { id: string };

export const GET = apiRoute<P>("profiles:read", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  if (!UUID.test(id)) return fail("not_found", "Profile not found.", rid, 404);
  const row = await ctx.store.getProfile(u.userId, id);
  return row ? ok(publicProfile(row, true), rid) : fail("not_found", "Profile not found.", rid, 404);
});

export const DELETE = apiRoute<P>("profiles:write", async (_req, ctx, rid, { id }) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  if (!UUID.test(id)) return fail("not_found", "Profile not found.", rid, 404);
  const row = await ctx.store.getProfile(u.userId, id);
  if (!row || !(await ctx.store.deleteProfile(u.userId, id))) return fail("not_found", "Profile not found.", rid, 404);
  later(() => emitWebhook(ctx.store, u.userId, "profile.deleted", { profileId: id, label: row.label, financialYear: row.fy }));
  return ok({ id, deleted: true }, rid);
});
