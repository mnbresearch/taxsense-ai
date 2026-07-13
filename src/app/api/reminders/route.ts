import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { brandedShell, sendOne } from "@/lib/email";
import { upcomingDeadlines } from "@/lib/deadlines";

export const runtime = "nodejs";

const Input = z.object({ email: z.string().email().max(120) });

/** Subscribe to deadline reminder emails (batch 16). */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`rem:${clientKey(req)}`, { capacity: 5, refillPerMinute: 2 });
  if (!rl.allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  try {
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "valid email required" }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    const sb = supabaseAdmin();
    if (!sb) return NextResponse.json({ error: "not configured" }, { status: 500 });
    const { error } = await sb.from("tax_reminders").insert({ email });
    if (error && !error.message.includes("duplicate")) {
      return NextResponse.json({ error: "could not save" }, { status: 500 });
    }
    if (!error) {
      const next = upcomingDeadlines(new Date(), 3);
      await sendOne({
        to: email,
        subject: "🔔 Deadline reminders are on — TaxSense AI",
        kind: "custom",
        html: brandedShell(
          "You'll never miss a tax deadline again",
          `<p style="color:#44403c;font-size:14px;line-height:1.6;">We'll email you 7 days and 1 day before every income-tax deadline. The next ones on your calendar:</p>
           <ul style="color:#44403c;font-size:14px;line-height:1.8;padding-left:18px;">
             ${next.map((n) => `<li><strong>${new Date(n.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong> — ${n.label}</li>`).join("")}
           </ul>
           <p style="color:#78716c;font-size:12px;">To stop reminders, reply to this email with STOP.</p>`
        ),
      });
    }
    return NextResponse.json({ ok: true, message: "Reminders on — confirmation sent to your inbox." });
  } catch {
    return NextResponse.json({ error: "could not save" }, { status: 400 });
  }
}
