import { later } from "@/lib/api/later";
import { apiRoute } from "@/lib/api/handler";
import { requireUserKey } from "@/lib/api/auth";
import { fail, ok, readJson } from "@/lib/api/respond";
import { cleanLabel, emitProfileSaved, publicProfile, saveProfile } from "@/lib/api/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeCursor(c: string | null): { updated_at: string; id: string } | null | "bad" {
  if (!c) return null;
  try {
    const v = JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as { u?: unknown; i?: unknown };
    if (typeof v.u === "string" && ISO.test(v.u) && typeof v.i === "string" && UUID.test(v.i)) return { updated_at: v.u, id: v.i };
  } catch { /* fallthrough */ }
  return "bad";
}

/** List your saved profiles (newest first). ?limit=1..100 (default 20) & cursor= */
export const GET = apiRoute("profiles:read", async (req, ctx, rid) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const sp = new URL(req.url).searchParams;
  const limit = sp.get("limit") === null ? 20 : Number(sp.get("limit"));
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return fail("invalid_request", "`limit` must be 1–100.", rid, 400);
  const cursor = decodeCursor(sp.get("cursor"));
  if (cursor === "bad") return fail("invalid_request", "`cursor` is invalid.", rid, 400);
  const rows = await ctx.store.listProfiles(u.userId, limit + 1, cursor);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ u: last.updated_at, i: last.id })).toString("base64url") : null;
  return ok({ items: page.map((r) => publicProfile(r, false)), nextCursor }, rid);
});

/** Create or update (by label) a saved profile. Idempotent per label. */
export const POST = apiRoute("profiles:write", async (req, ctx, rid) => {
  const u = requireUserKey(ctx, rid); if (!u.ok) return u.res;
  const b = await readJson(req, 100_000, rid);
  if (!b.ok) return b.res;
  const body = b.body as { label?: unknown; profile?: unknown };
  const label = cleanLabel(body?.label);
  if (!label) return fail("invalid_request", "`label` must be a string (1–120 characters).", rid, 400);
  if (!body?.profile || typeof body.profile !== "object") return fail("invalid_request", "`profile` object is required.", rid, 400);
  const r = await saveProfile(ctx.store, u.userId, label, body.profile);
  if (!r.ok) return fail(r.code, r.message, rid, r.code === "payment_required" ? 402 : 400);
  later(() => emitProfileSaved(ctx.store, u.userId, r.row));
  return ok(publicProfile(r.row, true), rid, { status: r.created ? 201 : 200 });
});
