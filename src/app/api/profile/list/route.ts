import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";
import { getEntitlementsForEmail } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Batch 38 — Client Workbook list. Business/Concierge only (server-enforced);
 * RLS additionally scopes rows to the signed-in user.
 */
type RegimeTotals = { totalTaxLiability?: number; totalIncome?: number };
type SavedRow = {
  label: string;
  updated_at: string;
  computation: { recommended?: "old" | "new"; old?: RegimeTotals; new?: RegimeTotals } | null;
};

export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ items: [], mode: "demo" });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const ent = await getEntitlementsForEmail(auth.user.email);
  if (!ent.features.clientWorkbook)
    return NextResponse.json(
      { error: "The Client Workbook is a Business feature (₹999/mo).", upgrade: true },
      { status: 402 }
    );

  const { data, error } = await sb
    .from("tax_profiles")
    .select("label, updated_at, computation")
    .eq("fy", "FY2025-26")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return serverError("profile/list", error);

  const items = (data ?? []).map((r: SavedRow) => ({
    label: r.label,
    updated_at: r.updated_at,
    recommended: r.computation?.recommended ?? null,
    tax: r.computation?.recommended ? r.computation[r.computation.recommended]?.totalTaxLiability ?? null : null,
    income: r.computation?.recommended ? r.computation[r.computation.recommended]?.totalIncome ?? null : null,
  }));
  return NextResponse.json({ items, mode: "supabase" });
}
