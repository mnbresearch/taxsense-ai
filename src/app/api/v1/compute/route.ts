import { apiRoute } from "@/lib/api/handler";
import { fail, ok, readJson } from "@/lib/api/respond";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { computeV1 } from "@/lib/api/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Compute tax under both regimes for a profile in the body. Nothing is stored. */
export const POST = apiRoute("compute", async (req, _ctx, rid) => {
  const b = await readJson(req, 100_000, rid);
  if (!b.ok) return b.res;
  const raw = (b.body as { profile?: unknown })?.profile;
  if (!raw || typeof raw !== "object") return fail("invalid_request", "`profile` object is required.", rid, 400);
  const parsed = safeParseProfile(raw);
  if (!parsed.ok) return fail("invalid_request", `Invalid profile — ${parsed.error}`, rid, 400);
  return ok(computeV1(parsed.profile), rid);
});
