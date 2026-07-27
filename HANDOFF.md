# TaxSense AI — Handoff & Continuation Guide

Built across 63 feature batches by MNB Research × Abrobot.ai. Live at **https://taxsense-ai.vercel.app**.
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


## Batches 28-39 (second marathon session)
- **Plan gating (28)**: `src/lib/entitlements.ts` (plan ids, feature flags: ctcDesigner/proTools/clientWorkbook/scenarios/pdfPerDay), `/api/entitlements`, magic-link sign-in (`/api/auth/signin` + AccountControl in workspace header), server-gated CTC Designer (teaser for free) and PDF daily cap (in-memory, per instance), UpsellModal.
- **Hindi (29)**: `src/lib/i18n.ts` dict + workspace toggle; intake responder replies in Hindi via lang flag through `/api/chat`.
- **PDF history (30)**: `pdf_history` table (migration 0007, applied), snapshot on generate, `/api/pdf/history`, re-download UI.
- **Welcome-back (31)** + **sample profiles (32)** (`src/app/app/samples.ts`) + **/tools/hra (33)** + **admin active-vs-pipeline MRR (34)**.
- **Professional suite (35-38)**: catalog `src/lib/pro.ts` + `/professional` (3 segments: students free / practitioners Pro / firms Business; all visible, gated execution). Tools: `/tools/interest` (s.234A/B/C engine `src/lib/tax-engine/interest.ts`, Rule 119A, safe harbour, presumptive), `/tools/breakeven` (regime crossover via binary search), `/tools/slabs` (engine-plotted curve), `/tools/sections` (24-section quick-ref `src/lib/sections.ts`). **Client Workbook** `/pro/clients`: label-keyed tax_profiles, server-enforced Business via `/api/profile/list` (402), `?client=` round trip in workspace, save-by-label.
- **Auto-update (39)**: `/api/health` exposes `build` (VERCEL_GIT_COMMIT_SHA); `src/app/UpdateWatcher.tsx` polls 10-min + on focus → reload (toast on /app to protect chat). SW cache v2.
- Tests: 17 files / 133. Push method that works: GitHub web upload + **JS form submit** (`input[name=message]` + click Commit via javascript_tool — coordinate/ref clicks are flaky). ALWAYS checksum-verify via raw.githubusercontent.
- Known debts: PDF cap is per-serverless-instance; package-lock.json out of sync with package.json (use `npm install`, not `npm ci`); free PDF/scenario caps client-visible via /api/entitlements.


## Batches 40-63 (third marathon session — launch week)
- **Tools**: quiz (24-Q bank, random 12/attempt, lead capture source "quiz"), 26AS TDS reconciliation (`src/lib/tds.ts`, in-browser), notice helper (`src/lib/notices.ts`, 6 playbooks), deadline .ics calendar, LTCG harvest planner (`src/lib/harvest.ts`), 80GG (`src/lib/rent80gg.ts`), gratuity (inline). All in `src/lib/pro.ts` catalog.
- **Email Studio (48-52)**: `email_templates` table (mig 0008) + track_id/template_name/opened_at on email_log; pixel `/api/e/o/[id]`; templates CRUD + 3 built-in starters; composer targeting (All/Active/Unconverted) + 🧪 test-send; per-template open rates; suppression list (mig 0009) + HMAC unsubscribe `/api/unsubscribe` (secret = SUPABASE_SERVICE_ROLE_KEY); sender "TaxSense AI · MNB Research"; campaigns CC FOUNDER_CC (mridulnanda2004@gmail.com).
- **Landing (53-54)**: free-tools grid from catalog, who-it's-for, pricing teaser, FAQ + JSON-LD (FAQPage + SoftwareApplication), hourly-revalidated deadline badge; ALL stale "launching July 13" copy removed.
- **Admin (55-57,60)**: tap-to-call tel: links, copy-emails; digest 2.0 (opens/unsubs/activations/MRR split); workbook client delete (`DELETE /api/profile?label=`); traffic panel + anonymous pageview beacon (`PageBeacon` in layout → audit_events "pageview", `/api/admin/traffic`).
- **Public**: `/whats-new` changelog (`src/lib/changelog.ts` — UPDATE THIS when shipping features; the Monday digest reads CHANGELOG[0]).
- **Weekly digest (63)**: cron sends "This week at TaxSense AI" every IST-Monday to all access_requests (≤500) — suppression-aware, template "weekly-digest".
- **Ops facts**: ADMIN_EMAILS env = mridulnanda2004@gmail.com,mnbgotyou@gmail.com (fixed + redeployed after 403s; Sensitive, write-only in Vercel). LinkedIn launch posted 27 Jul from founder's profile. Real leads at that time: none (only founder's own emails) — growth = posting the launch kit (outputs/professional-suite-launch.md).
- **Push method**: GitHub web upload; ONLY reliable commit = javascript_tool setting input[name=message] + clicking Commit button; verify EVERY file via raw.githubusercontent (bytes or md5, cache-bust). /tmp sandbox gets wiped — re-clone + `npm install --prefer-offline` (cache persists in /sessions/.npm). Supabase sessions expire — user must sign in.
- Tests: 20 files / 147. Suite catalog = 17 tools.
