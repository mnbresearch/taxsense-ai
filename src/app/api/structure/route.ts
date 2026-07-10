import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { optimizeStructure } from "@/lib/optimizer/structure";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Input = z.object({
  ctc: z.number().min(100_000).max(1_000_000_000),
  rentPaid: z.number().min(0).max(100_000_000).default(0),
  isMetroCity: z.boolean().default(false),
  age: z.number().int().min(18).max(110).default(30),
  currentBasicPct: z.number().min(10).max(90).optional(),
  currentEmployerNpsPct: z.number().min(0).max(14).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`struct:${clientKey(req)}`, { capacity: 30, refillPerMinute: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; ") },
        { status: 400 }
      );
    const report = optimizeStructure(parsed.data);
    // keep the payload lean: top 6 options only
    return NextResponse.json({ ...report, options: report.options.slice(0, 6) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "structure optimization failed" }, { status: 500 });
  }
}
