import { NextRequest, NextResponse } from "next/server";
import { computeBoth } from "@/lib/tax-engine";
import { optimize } from "@/lib/optimizer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json();
    if (!profile) return NextResponse.json({ error: "profile required" }, { status: 400 });
    const comparison = computeBoth(profile);
    const optimizer = optimize(profile);
    return NextResponse.json({ comparison, optimizer });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "compute failed" }, { status: 500 });
  }
}
