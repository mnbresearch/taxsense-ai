# TaxSense AI — Handoff & Continuation Guide

Built across 27 feature batches by MNB Research × Abrobot.ai. Live at **https://taxsense-ai.vercel.app**.
Marketing: **mnbresearch.com/taxsense-ai** (+ portfolio card, 2 blog posts, Services & main nav entries — all on the Odoo site).

## Stack & infrastructure
- **Next.js 14.2.33 (App Router, TS, Tailwind)** on Vercel (region bom1), auto-deploys from `main` of `mnbresearch/taxsense-ai` (fork of `mridulnanda/taxsense-ai`).
- **Supabase** (project `rsuevtdelaqjjqtyiosd`, Mumbai): Postgres + magic-link auth. RLS deny-by-default. Migrations in `supabase/migrations/0001–0006` (all applied in prod via SQL editor).
- **AI intake**: Groq `llama-3.3-70b-versatile` (fallback Anthropic, then mock). Zod-armored extraction (`src/lib/intake/schema.ts` — money preprocessor, auto-wrap of stray keys).
- **Email**: Resend, from `AbroBot <hello@updates.mnbresearch.com>`, reply-to `mnbgotyou@gmail.com`. All sends logged to `email_log`.
- **Cron**: Vercel daily 02:00 UTC → `/api/cron/keepalive` (DB keep-alive, retention jobs `execute_pending_deletions` + `purge_stale_intake_messages`, D-7/D-1 deadline reminder emails, founder daily digest).
- **PWA**: `public/sw.js` (never caches `/api/*`), install button `src/app/InstallApp.tsx`, manifest shortcuts, background privacy blur.

### Env vars (Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sb_publishable), `SUPABASE_SERVICE_ROLE_KEY` (sb_secret), `GROQ_API_KEY`, `RESEND_API_KEY`, `ADMIN_EMAILS`, optional `CRON_SECRET`.

## Core modules
- `src/lib/tax-engine/` — deterministic FY 2025-26 engine (slabs, 87A+marginal relief, HRA Rule 2A, 111A/112A/112, VI-A caps, surcharge, 288A/B), `score.ts` (Tax Health Score), `advanceTax.ts`, `itrForm.ts`, `validate.ts`.
- `src/lib/optimizer/` — ranked ₹-quantified moves, `structure.ts` (CTC Designer), `taxjar.ts`, `insights.ts`.
- `src/lib/` — `email.ts` (brandedShell, sendOne w/ logging, sendAccessRequestEmails, sendCampaign), `deadlines.ts`, `glossary.ts`, `rateLimit.ts`, `guide.ts`, `share.ts`, `pdf/`.
- Pages: `/` `/app` `/guide` `/pricing` `/deadlines` `/learn` `/compare` `/privacy` `/terms` `/s/[data]` `/admin` + branded 404.
- **Tests**: `npx vitest run` → 13 files / 105 tests. Typecheck: `npx tsc --noEmit`.

## Business flows (all live)
1. **Lead**: request-access / plan request (name+email+phone) → row in `access_requests` → admin email + requester confirmation → visible in `/admin` with pipeline-MRR card.
2. **Manual payment**: call lead → collect UPI/bank → click **₹ Paid** in admin → status `active`, activation email sent, audited.
3. **Campaigns**: admin composer ({name} personalisation, "Use all leads") → logged in `email_log`.
4. **Reminders**: `tax_reminders` subscribers get D-7/D-1 emails from cron; admin can deactivate.
5. Plans: Starter ₹0 · Pro ₹399/mo (₹3,999/yr) · Business ₹999/mo (₹9,999/yr) · Concierge ₹2,499/mo · Filed For You ₹4,999/return. NOTE: "active" is a billing record; features are NOT yet gated by plan.

## Gotchas for future sessions
- Sandbox mounted FS blocks overwrites → build/test from a copy in `/tmp` if needed; `next` pinned exactly 14.2.33 (aarch64 SWC).
- Commits went via GitHub web upload (no git creds): `/upload/main/<dir>`, one dir per commit; **verify every commit landed** (uploads occasionally drop silently — check raw.githubusercontent).
- Odoo site edits: logged-in admin browser → `/web/dataset/call_kw` JSON-RPC (pages `website.page` 847 = /taxsense-ai, view 2741; blog posts 362/363).
- CSP blocks cross-origin fetch from the app origin — verify via same-origin fetch or server-side.

## Roadmap (in priority order)
1. **Plan gating**: entitlements table keyed by auth email ↔ `access_requests.status/plan`; gate CTC Designer, unlimited PDFs, scenarios; upsell modal for free users.
2. **Razorpay** (when account exists): payment links/checkout on `/pricing`, webhook → auto-activate (reuse PATCH logic).
3. Hindi UI toggle; Play Store TWA listing; per-user PDF history.

## Standing reminders
- **Rotate the Groq key** (was pasted in chat) → console.groq.com → update Vercel env → redeploy.
- Delete test leads (`testlead@example.com`, `mridulnanda2004+plantest@gmail.com`) via ✕ in admin.
- Have a lawyer review `/privacy` and `/terms` before serious revenue.
