/** Consistent JSON envelope for /api/v1: { data } or { error: { code, message } } + X-Request-Id. */
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export type ErrorCode =
  | "unauthorized" | "forbidden" | "not_found" | "invalid_request" | "payload_too_large"
  | "rate_limited" | "conflict" | "payment_required" | "internal_error" | "unavailable";

export function requestId(): string { return randomUUID(); }

export function ok(data: unknown, rid: string, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json({ data }, { status: init?.status ?? 200, headers: { "x-request-id": rid, "cache-control": "no-store", ...(init?.headers ?? {}) } });
}

export function fail(code: ErrorCode, message: string, rid: string, status: number, extra?: { details?: unknown; headers?: Record<string, string> }) {
  return NextResponse.json(
    { error: { code, message, ...(extra?.details !== undefined ? { details: extra.details } : {}) }, requestId: rid },
    { status, headers: { "x-request-id": rid, "cache-control": "no-store", ...(extra?.headers ?? {}) } }
  );
}

/** Read a JSON body with a hard size cap. Returns a response on failure. */
export async function readJson(req: Request, maxBytes: number, rid: string): Promise<{ ok: true; body: unknown } | { ok: false; res: NextResponse }> {
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) return { ok: false, res: fail("payload_too_large", `Body exceeds ${maxBytes} bytes`, rid, 413) };
  if (!text.trim()) return { ok: false, res: fail("invalid_request", "JSON body required", rid, 400) };
  try { return { ok: true, body: JSON.parse(text) }; }
  catch { return { ok: false, res: fail("invalid_request", "Body is not valid JSON", rid, 400) }; }
}

/** zod issues → compact, safe details (path + message only). */
export function zodDetails(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.slice(0, 20).map((i) => ({ path: i.path.map(String).join("."), message: i.message }));
}
