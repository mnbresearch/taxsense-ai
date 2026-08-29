import { NextRequest, NextResponse } from "next/server";
import { runIntakeTurn, newIntakeState } from "@/lib/intake/engine";
import type { IntakeState } from "@/lib/intake/engine";
import { supabaseServer, demoEvents } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { glossaryAnswer } from "@/lib/glossary";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`chat:${clientKey(req)}`, { capacity: 20, refillPerMinute: 15 });
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Whoa — too many messages at once. Give me a few seconds." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  try {
    const body = await req.json();
    const state: IntakeState = body.state ?? newIntakeState();
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const message = String(body.message ?? "").slice(0, 4000);
    if (!message.trim()) return NextResponse.json({ error: "empty message" }, { status: 400 });

    // Glossary fast-path: definitional questions answered locally — instant,
    // accurate, zero LLM cost. Profile state is untouched.
    const gloss = glossaryAnswer(message);
    if (gloss) {
      return NextResponse.json({
        reply: `**${gloss.term}** — ${gloss.answer}\n\nBack to your profile: anything else about your income or savings?`,
        state,
        provider: "glossary/local",
        extraction: { updates: {}, notApplicable: [], estimates: [], clarify: null },
      });
    }

    const lang = body.lang === "hi" ? "hi" : "en";
    const turn = await runIntakeTurn(state, history, message, lang);

    // best-effort persistence of the transcript (never blocks the reply)
    const sb = supabaseServer();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data.user && body.profileId) {
        await sb.from("intake_messages").insert([
          { profile_id: body.profileId, user_id: data.user.id, role: "user", content: message },
          { profile_id: body.profileId, user_id: data.user.id, role: "assistant", content: turn.reply },
        ]);
      }
    } else {
      demoEvents.push({ event: "chat_turn", at: new Date().toISOString() });
    }

    // Batch 83 — degradation is a pageable event, not a silent shrug.
    if (turn.providerName.startsWith("mock") && (process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY)) {
      const { supabaseAdmin } = await import("@/lib/supabase/server");
      const admin = supabaseAdmin();
      if (admin) await admin.from("audit_events").insert({ event: "llm_degraded", meta: { provider: turn.providerName } });
    }

    return NextResponse.json({
      reply: turn.reply,
      state: turn.state,
      provider: turn.providerName,
      extraction: turn.extraction,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "chat failed" }, { status: 500 });
  }
}
