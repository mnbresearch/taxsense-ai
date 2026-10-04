import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runIntakeTurn, newIntakeState } from "@/lib/intake/engine";
import type { IntakeState } from "@/lib/intake/engine";
import { supabaseAdmin } from "@/lib/supabase/server";
import { safeParseProfile } from "@/lib/tax-engine/validate";
import { clientKey, rateLimitShared } from "@/lib/rateLimit";
import { glossaryAnswer } from "@/lib/glossary";
import { looksLikeDocument, redactPII } from "@/lib/intake/pii";
import { fieldsToPartialProfile, importDocument } from "@/lib/intake/docImport";

type Tree = { [k: string]: unknown };
function deepMerge(base: Tree, add: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(add)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object"
      ? deepMerge(out[k] as Tree, v as Tree)
      : v;
  }
  return out;
}
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY = 64_000; // bytes — a full profile + 12 turns fits comfortably

const Body = z.object({
  message: z.string().min(1).max(4000),
  lang: z.enum(["en", "hi"]).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000).transform((s) => s.slice(0, 2000)) }))
    .max(40)
    .optional(),
  state: z
    .object({
      profile: z.unknown(),
      notApplicable: z.array(z.string().max(60)).max(40).default([]),
      estimates: z.array(z.string().max(300)).max(40).default([]),
      covered: z.array(z.string().max(60)).max(60).default([]),
      complete: z.boolean().default(false),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimitShared(`chat:${clientKey(req)}`, 30, 60, { capacity: 30, refillPerMinute: 20 });
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Whoa — too many messages at once. Give me a few seconds." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }
    );
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ error: "conversation too large — start a new one" }, { status: 413 });
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }
    const parsed = Body.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "invalid chat request" }, { status: 400 });
    const body = parsed.data;
    const message = body.message;
    if (!message.trim()) return NextResponse.json({ error: "empty message" }, { status: 400 });

    // The client round-trips its state; never trust it — re-validate the profile.
    let state: IntakeState = newIntakeState();
    if (body.state) {
      const prof = safeParseProfile(body.state.profile);
      if (!prof.ok) return NextResponse.json({ error: "invalid profile state" }, { status: 400 });
      state = { ...body.state, profile: prof.profile };
    }
    // Identity documents never leave our server: earlier pasted documents are
    // dropped from history, and PAN/TAN/Aadhaar are stripped from every turn.
    const history = (body.history ?? []).slice(-12).map((h) => ({
      role: h.role,
      content: looksLikeDocument(h.content) ? "[document pasted — read locally by TaxSense, not shown to the AI]" : redactPII(h.content),
    }));

    // Pasted Form 16 / AIS: parse it here with the deterministic importer. No LLM.
    if (looksLikeDocument(message)) {
      const doc = importDocument(message);
      if (doc.recognised && doc.fields.length > 0) {
        const merged = safeParseProfile(deepMerge(state.profile as unknown as Tree, fieldsToPartialProfile(doc.fields) as Tree));
        if (merged.ok) state = { ...state, profile: merged.profile };
        const lines = doc.fields.map((f) => `• ${f.label}: ${inr(f.value)}`).join("\n");
        const notes = doc.notes.length ? "\n\n" + doc.notes.map((n) => `ℹ️ ${n}`).join("\n") : "";
        return NextResponse.json({
          reply:
            `📄 I read your ${doc.kind === "ais" ? "AIS/TIS" : "Form 16"} right here on our server — it was **not** sent to any AI model, and your PAN/TAN aren't kept.\n\n${lines}${notes}\n\nThese are now in your computation on the right. Check them against your document — anything to correct, or other income to add?`,
          state,
          provider: "docimport/local",
          extraction: { updates: {}, notApplicable: [], estimates: [], clarify: null },
        });
      }
      return NextResponse.json({
        reply:
          "That looks like a tax document, but I couldn't pick out the amounts. For privacy it wasn't sent to the AI. Paste just the Part B salary/deductions section, or use the Form 16 importer at /tools/import — or simply tell me your gross salary, TDS and deductions.",
        state,
        provider: "docimport/local",
        extraction: { updates: {}, notApplicable: [], estimates: [], clarify: null },
      });
    }

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

    const turn = await runIntakeTurn(state, history, redactPII(message), body.lang ?? "en");

    // Degradation is a pageable event, not a silent shrug.
    if (turn.providerName.startsWith("mock") && (process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY)) {
      const admin = supabaseAdmin();
      if (admin) await admin.from("audit_events").insert({ event: "llm_degraded", meta: { provider: turn.providerName } });
    }

    return NextResponse.json({
      reply: turn.reply,
      state: turn.state,
      provider: turn.providerName,
      extraction: turn.extraction,
    });
  } catch (e) {
    console.error("chat failed", e);
    return NextResponse.json({ error: "Something went wrong on our side — please try again." }, { status: 500 });
  }
}
