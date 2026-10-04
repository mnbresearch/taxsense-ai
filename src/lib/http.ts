import { NextResponse } from "next/server";

/**
 * Log the real error server-side (visible in Vercel logs) and return a generic
 * message to the client — never leak DB/schema/provider internals in responses.
 */
export function serverError(tag: string, err: unknown, publicMessage = "Something went wrong — please try again.", status = 500) {
  const detail = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err);
  console.error(`[${tag}]`, detail);
  return NextResponse.json({ error: publicMessage }, { status });
}
