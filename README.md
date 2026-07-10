# TaxSense AI

AI-native Indian income-tax filing copilot — FY 2025-26 (AY 2026-27). An MNB Research product.

**Talk, don't form-fill.** Describe your income in plain language; TaxSense structures it, computes tax under both regimes with auditable section-cited math, quantifies the deduction moves you're missing, and generates a filing-ready PDF.

## Architecture

```
src/lib/tax-engine/    Pure-function rules engine (the core IP)
  constants.ts         FY 2025-26 statutory figures, verified & sourced
  engine.ts            Both-regime computation: HRA, 87A (+marginal relief),
                       surcharge (+15% CG cap, marginal relief), 111A/112A/112,
                       house-property set-off, VI-A caps, senior slabs
src/lib/optimizer/     What-if simulation + ranked ₹-quantified suggestions
src/lib/intake/        Conversational intake: LLM extracts → zod validates →
                       deterministic merge; Groq primary, Claude fallback,
                       zero-key mock mode
src/lib/pdf/           Filing-summary PDF (pdf-lib, server-side)
src/app/               Next.js 14: landing, chat workspace, admin dashboard
supabase/migrations/   Postgres schema: RLS deny-by-default, deletion queue,
                       retention functions, aggregate-only admin stats
scripts/bakeoff.ts     Model bake-off harness (5 labelled conversations)
tests/                 42 unit tests, hand-computed expected values
docs/                  Positioning memo, bake-off memo, privacy design,
                       deploy guide, launch copy
```

## Quick start

```bash
npm install
npm test        # rules engine + optimizer + intake + pdf + bakeoff scorer
npm run dev     # full demo mode with zero API keys
```

Add `GROQ_API_KEY` for real conversations; add Supabase env for auth + persistence (see `docs/DEPLOY.md`).

## Honest limitations (v1)

- Covers resident individuals; NRI/DTAA, foreign assets, F&O business treatment, AMT, and clubbing are out of scope — flagged to the user rather than guessed.
- Surcharge marginal relief uses the standard slab-income construction; exotic mixed-income cases near thresholds should be CA-reviewed (the PDF says so).
- Not an e-filing intermediary: output is a filing-ready summary, not an ITR submission.

Computed under the Income-tax Act, 1961 as amended by Finance Act 2025. Not a substitute for professional advice.

## Email notifications

Access requests and first-time logins trigger transactional emails via Resend (`RESEND_API_KEY`, server-side only). Admin notifications go to the configured admin inbox; requesters get a branded confirmation.
