import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRentReceiptsPdf } from "@/lib/pdf/rentReceipts";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Input = z.object({
  tenantName: z.string().min(2).max(80),
  landlordName: z.string().min(2).max(80),
  landlordPan: z.string().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/).optional(),
  propertyAddress: z.string().min(5).max(160),
  monthlyRent: z.number().min(500).max(10_000_000),
  months: z.number().int().min(1).max(12).optional(),
  paymentMode: z.enum(["bank transfer", "UPI", "cash", "cheque"]).optional(),
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(`rr:${clientKey(req)}`, { capacity: 6, refillPerMinute: 3 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; ") },
        { status: 400 }
      );
    const pdf = await generateRentReceiptsPdf(parsed.data);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="rent-receipts-fy2025-26.pdf"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "generation failed" }, { status: 500 });
  }
}
