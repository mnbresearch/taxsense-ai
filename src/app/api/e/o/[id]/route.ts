import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1×1 transparent GIF. */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * Batch 48 — email open beacon. The track_id is an unguessable UUID minted
 * per send; first hit stamps opened_at. No cookies, no PII, nothing stored
 * beyond the timestamp on the existing log row.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const admin = supabaseAdmin();
    if (admin) {
      admin
        .from("email_log")
        .update({ opened_at: new Date().toISOString() })
        .eq("track_id", id)
        .is("opened_at", null)
        .then(() => {}, () => {});
    }
  }
  return new NextResponse(PIXEL, {
    headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" },
  });
}
