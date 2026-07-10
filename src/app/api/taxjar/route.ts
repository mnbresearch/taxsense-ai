import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { taxJar } from "@/lib/optimizer/taxjar";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Input = z.object({
  receiptsToDate: z.number().min(0).max(10_000_000_000),
  monthsElapsed: z.number().int().min(1).max(12),
  kind: z.enum(["business", "professional"]),
  presumptive: z.boolean(),
  digitalShare: z.number().min(0).max(1).optional(),
  taxPaidSoFar: z.number().min(0).max(10_000_000_000).optional(),
  age: z.number().int().min(18).max(110).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`jar:${clientKey(req)}`, { capacity: 30, refillPerMinute: 20 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; ") },
        { status: 400 }
      );
    return NextResponse.json(taxJar(parsed.data));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "tax jar failed" }, { status: 500 });
  }
}
