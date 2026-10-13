import { apiRoute } from "@/lib/api/handler";
import { fail, ok } from "@/lib/api/respond";
import { DEADLINES } from "@/lib/deadlines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Deadline calendar. ?from=YYYY-MM-DD (default today, IST) & limit=1..50 (default 10). */
export const GET = apiRoute("deadlines:read", async (req, _ctx, rid) => {
  const sp = new URL(req.url).searchParams;
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const from = sp.get("from") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return fail("invalid_request", "`from` must be YYYY-MM-DD.", rid, 400);
  const limit = sp.get("limit") === null ? 10 : Number(sp.get("limit"));
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return fail("invalid_request", "`limit` must be 1–50.", rid, 400);
  const items = DEADLINES.filter((d) => d.date >= from).slice(0, limit);
  return ok({ items, financialYear: "FY2025-26" }, rid);
});
