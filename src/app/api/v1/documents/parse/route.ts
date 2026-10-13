import { apiRoute } from "@/lib/api/handler";
import { fail, ok, readJson } from "@/lib/api/respond";
import { importDocument, fieldsToPartialProfile } from "@/lib/intake/docImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parse pasted Form 16 (Part B) or AIS/TIS text with the deterministic parser.
 * No AI, nothing stored, and identity numbers are never returned (only amounts).
 */
export const POST = apiRoute("documents:parse", async (req, _ctx, rid) => {
  const b = await readJson(req, 210_000, rid);
  if (!b.ok) return b.res;
  const body = b.body as { text?: unknown; kind?: unknown };
  if (typeof body?.text !== "string" || !body.text.trim()) return fail("invalid_request", "`text` (string) is required.", rid, 400);
  if (body.text.length > 200_000) return fail("payload_too_large", "`text` is longer than 200,000 characters.", rid, 413);
  if (body.kind !== undefined && body.kind !== "form16" && body.kind !== "ais") return fail("invalid_request", "`kind` must be 'form16' or 'ais'.", rid, 400);
  const r = importDocument(body.text, body.kind as "form16" | "ais" | undefined);
  return ok({
    recognised: r.recognised,
    kind: r.kind,
    fields: r.fields.map((f) => ({ path: f.path, label: f.label, value: f.value })),
    partialProfile: fieldsToPartialProfile(r.fields),
    notes: r.notes,
  }, rid);
});
