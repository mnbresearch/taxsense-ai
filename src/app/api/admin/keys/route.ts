import { NextResponse } from "next/server";
import { isAdminEmail, supabaseServer } from "@/lib/supabase/server";
import { getApiStore } from "@/lib/api/store";
import { keyStatus } from "@/lib/api/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: all keys (metadata only — never hashes) for oversight + emergency revoke via /api/keys/{id}. */
export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isAdminEmail(auth.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const store = getApiStore();
    const rows = await store.listKeys({ all: true });
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const usage = await store.usageSince(rows.map((r) => r.id), since).catch(() => ({} as Record<string, number>));
    return NextResponse.json({
      keys: rows.map((r) => ({ id: r.id, keyId: r.key_id, kind: r.kind, name: r.name, scopes: r.scopes, status: keyStatus(r), createdAt: r.created_at, expiresAt: r.expires_at, lastUsedAt: r.last_used_at, requests30d: usage[r.id] ?? 0, owner: r.user_id ? r.user_id.slice(0, 8) : null })),
    });
  } catch {
    return NextResponse.json({ error: "Run migration 0014 to enable API keys." }, { status: 503 });
  }
}
