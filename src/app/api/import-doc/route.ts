import { NextRequest, NextResponse } from "next/server";
import { importDocument, type ImportKind } from "@/lib/intake/docImport";
import { clientKey, rateLimitShared } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Batch 98 — parse a pasted Form 16 (Part B) or AIS/TIS summary into a
 * reviewable set of fields. Pure text parsing: nothing is stored, no LLM,
 * no auth needed. The client shows the result for the user to confirm
 * before any value touches their return.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimitShared(`import:${clientKey(req)}`, 20, 60, { capacity: 20, refillPerMinute: 10 });
  if (!rl.allowed) return NextResponse.json({ error: "too many attempts — wait a minute" }, { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ error: "paste the text of your Form 16 or AIS" }, { status: 400 });
  if (text.length > 200000) return NextResponse.json({ error: "that's too long — paste just the summary section" }, { status: 400 });

  const kind: ImportKind | undefined =
    body.kind === "form16" || body.kind === "ais" ? body.kind : undefined;

  const result = importDocument(text, kind);
  if (!result.recognised) {
    return NextResponse.json({
      recognised: false,
      error: "Couldn't recognise this as a Form 16 or AIS. Paste the Part B / summary section that lists the amounts.",
    });
  }
  return NextResponse.json(result);
}
