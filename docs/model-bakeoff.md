# Session 7 — Intake-model bake-off: recommendation memo

**Decision: ship `groq/llama-3.3-70b-versatile` for extraction, `llama-3.1-8b-instant` for the responder voice, with `claude-haiku-4-5` as the automatic fallback provider.**

## How to read this memo

The repo ships a runnable harness — `scripts/bakeoff.ts` — with 5 hand-labelled test conversations (fresh salaried, rental-income owner, freelancer, stock seller, senior citizen) scored field-by-field against ground truth. I could not execute the paid API calls from this environment (no keys yet), so the *quantitative* head-to-head is one command away for you:

```bash
GROQ_API_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/bakeoff.ts
```

The recommendation below is based on verified July-2026 pricing, the task's shape, and the architecture we chose. Re-run the harness before launch; if llama-3.3-70b scores below ~90% of fields, promote Haiku to primary.

## The task is easier than it looks — by design

The intake engine (Session 3) deliberately keeps the LLM's job small: extract a **partial** JSON update from one message, validated by zod, merged deterministically. The model never does tax math, never sees the whole profile logic, and a failed parse degrades to a clarifying question. This means a strong open-weights 70B model is plausibly sufficient, and per-message latency/cost dominate the experience.

## Verified pricing (July 2026)

| Model | Input $/M | Output $/M | Notes |
|---|---|---|---|
| groq/llama-3.1-8b-instant | $0.05 | $0.08 | ~500+ tok/s on LPU |
| groq/llama-3.3-70b-versatile | $0.59 | $0.79 | free tier: no card, 30 RPM, 1k–14.4k req/day |
| claude-haiku-4-5 | ~$1.00 | ~$5.00 | best small-model extraction accuracy |
| claude-sonnet-5 | ~$3.00 | ~$15.00 | overkill for per-message extraction |

A full intake conversation ≈ 15 turns × (~1.2k input + 250 output tokens) ≈ 18k in / 4k out:

- llama-3.3-70b: **≈ ₹1.2 per completed intake** (~$0.014)
- claude-haiku-4-5: ≈ ₹3.2 (~$0.038)
- claude-sonnet-5: ≈ ₹9.6 (~$0.11)

All are affordable; the difference is that Groq's **free tier alone (1k+ requests/day) covers the entire beta**, and its LPU latency (~sub-second for these payloads) is what makes the chat feel like talking, not waiting.

## Accuracy-per-rupee call

- **Numeric normalisation ("80k a month", "12 LPA", "2.4 lakh")** — deterministic rules in the prompt + zod bounds catch most failure modes regardless of model; this is where 8B models stumble and 70B models are fine.
- **Classification (112A vs 111A holding periods, 80C vs 80D routing)** — the genuinely hard part. Claude models are meaningfully better here; that's why the *fallback* path (any Groq error or repeated schema failure → Anthropic provider) is wired into `provider.ts` already.
- **Sonnet-class models** buy accuracy the architecture doesn't need at 8× Haiku's price — rejected on accuracy-per-rupee.
- **8B-instant as primary extractor** — rejected: schema-miss rate on messy money phrasing typically forces re-asks, which costs conversation quality, the scarcest resource.

**Net: Groq 70B primary (speed + free tier + adequate accuracy), Haiku fallback (accuracy insurance), 8B for the low-stakes responder voice.** Revisit with real bake-off numbers after ~200 beta conversations, using logged schema-failure rate as the tiebreaker.

Sources: [Groq pricing](https://groq.com/pricing) · [Groq rate limits](https://console.groq.com/docs/rate-limits) · [CloudZero Groq pricing 2026](https://www.cloudzero.com/blog/groq-pricing/) · [Helicone 70B calculator](https://www.helicone.ai/llm-cost/provider/groq/model/llama-3.3-70b-versatile)
