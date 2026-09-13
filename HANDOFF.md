# TaxSense AI — Session Handoff (through Batch 99 · LAUNCH-CERTIFIED)

**Live:** https://taxsense.mnbresearch.com (Vercel, auto-deploys from `main`; old taxsense-ai.vercel.app 308-redirects here)
**Entity:** ABROBOT TECHNOLOGIES PRIVATE LIMITED (MNB Research). Founder: Mridul Nanda (mridulnanda2004@gmail.com; leads inbox mnbgotyou@gmail.com).

## Stack
Next.js 14 App Router + TS + Tailwind · Supabase (project rsuevtdelaqjjqtyiosd): Postgres, RLS deny-by-default, magic-link + OTP auth · Resend (verified domain updates.mnbresearch.com) · Vercel Hobby (bom1), cron 02:00 UTC daily.
Tests: `npx vitest run` — 28 files / 230 tests. Always run tsc + vitest + next build before pushing.

## Product surface (all live)
- **Workspace /app** — conversational intake (extract+respond LLM prompts in src/lib/intake/prompts.ts, proactive-CA behaviors), live both-regime engine, optimizer, Tax Health Score, PDFs, scenarios, samples, Hindi, share/WhatsApp, PWA that self-updates (UpdateWatcher polls /api/health build sha).
- **Engine** src/lib/tax-engine — deterministic FY 2025-26; advance tax, ITR recommender, 234 interest, score.
- **Filing Kit /tools/filing** (Batch 76) — src/lib/filing.ts: ITR pick + personalized doc checklist + scrutiny red-flag radar (belated/AIS/landlord-PAN/refund/10-IEA) + portal walkthrough.
- **Free tools**: slabs, sections, HRA, 80GG, gratuity, harvest, quiz (24-q bank), calendar (.ics), glossary, **rent receipts** (Batch 78), **take-home calculator** (Batch 79), tools hub /tools.
- **Pro tools** (gated by entitlements): 234A/B/C interest, breakeven matrix, notice helper **with draft reply skeletons** (Batch 78), 26AS reconciliation, CTC designer, unlimited PDFs. Business: client workbook, reminder service.
- **Monetization loop**: /pricing plan request → admin grants via ₹ Paid (PATCH /api/admin/access-requests?action=activate|revoke|setPlan) → PLAN_FEATURES in src/lib/entitlements.
- **Auth (Batches 74-75)**: /api/auth/signin generates magic link + 6-digit OTP via admin.generateLink (auto-creates users), sends BRANDED email via Resend (code works on any device); /api/auth/verify accepts email+magiclink token types. Fallback: Supabase stock email. Supabase Site URL + redirect URLs point at taxsense.mnbresearch.com.
- **Email**: src/lib/email.ts — branded shell, open-pixel tracking, HMAC unsubscribe + suppressions, FOUNDER_CC on campaigns; admin Email Studio (templates, audiences, test-send, open rates).
- **Automations**: daily keepalive cron → retention + D-7/D-1 deadline reminders + founder digest (opens/unsubs/activations/MRR); Monday weekly digest emails CHANGELOG[0] — **update src/lib/changelog.ts whenever you ship**.
- **Observability**: pageview beacon → /api/admin/traffic; client_error surfacing in admin.

## Push workflow (no git creds — GitHub web via Chrome MCP)
1. Clone to /tmp, `npm install --prefer-offline` (NOT npm ci), make changes, tsc + vitest + build.
2. Push via https://github.com/mnbresearch/taxsense-ai/upload/main/<dir>: javascript_tool injects `new File([content], name)` into `input[type=file]` + change event (multiple files same dir = one commit). SHA-256 the JS string in-browser and compare to local BEFORE committing.
3. Commit in a SEPARATE call: set `input[name="message"]`, click enabled "Commit changes" (never same-call setTimeout — commits silently fail).
4. Verify bytes via GitHub contents API (raw CDN lies). Wait ~90s → check /api/health `build` sha → probe live URLs.

## Since Batch 80 (all live, all verified)
- **Payments (82)**: Cashfree end-to-end — /api/pay/create-order (server-side price catalog), hosted checkout on /pricing, hardened webhook (ms-timestamp normalisation, raw-body HMAC, constant-time, fail-closed, idempotent fulfilment), /api/pay/status fallback, /pay/return, payments ledger (migration 0010, applied). Env: CASHFREE_CLIENT_ID/SECRET/ENV=production set. Auto-activation + branded emails verified; live ₹ charge test pending founder.
- **AI resilience (83-84)**: provider chain Groq GPT-OSS-120B → 20B → Anthropic (if key) → LLM_FALLBACK_URL/KEY/MODEL slot (Gemini/OpenRouter/Cerebras) → strong deterministic extractor; llm_degraded telemetry. Groq Llama models are Enterprise-only in 2026 — GPT-OSS is the free tier. CRITICAL fix: workspace crash from scrollIntoView-as-cleanup (Chrome) — braced.
- **Practice Suite (85-90)**: /tools/gst, /tools/tds-rates (incl. new 194T), /tools/audit (44AB traps + 40(b) + 115BAA/BAB), /tools/property (12.5% vs indexed 20% + 54/54F/54EC), /tools/residency (s.6 + gifts), /tools/advance-tax. Pricing page rewritten to match product.
- **Growth (91-93)**: /playbook — 14 strategies + 6 case studies with engine-verified numbers (labelled illustrative composites) + share buttons; landing lead magnet "60-second Tax Check" → instant both-regime answer, /api/tax-check emails full report to lead AND lead (with phone, tel: link, computed opportunity) to mnbgotyou; lead rows land in admin (source: tax-check).
- **Hygiene (94)**: ZERO taxsense-ai.vercel.app strings anywhere in src; "beta" framing retired; all 39 routes 200; API battery green; browser flows verified (lead magnet recompute, workspace samples, playbook filters/share, GST tool).

## Batch 96 (8 Sep 2026) — final hardening pass
- next.js 14.2.33 → 14.2.35 (security patch) + dependency audit fixes (nanoid, browserslist).
- tax-check lead emails now HTML-escape user-supplied name/email (injection hardening).
- Pricing Pay button: if an ad-blocker silently blocks the Cashfree redirect, users now see clear guidance (pause blocker / pay from phone) instead of a dead button.
- Re-certified: 230/230 tests, tsc clean, prod build 61 pages, all live routes 200, engine anchor ₹1,09,200 / ITR-4 exact, webhook fail-closed 401s, PDF valid, chat AI extracting live (groq gpt-oss-120b), zero console errors.
- Emailed care@cashfree.com requesting Payment Links API + S2S UPI-QR enablement (code already deployed for both).

## Batches 97-99 (13 Sep 2026)
- **Batch 97 — serverless-safe rate limiting:** shared Postgres-backed limiter (`rl_hit` RPC, migration 0011) on signin/verify/tax-check/access-request/chat, graceful in-memory fallback. Closes the concurrent-bypass gap the stress test found. **Founder step: run supabase/migrations/0011_rate_limits.sql** (done ✓ if the limiter returns 429s under concurrent load).
- **Batch 98 — Form 16 / AIS import + ITR filing sheet:** /tools/import parses pasted Form 16 (Part B) or AIS/TIS into reviewable fields (deterministic, no storage). Compute now returns a schedule-mapped `filingSheet`.
- **Batch 99 — ITR-1 draft JSON:** compute returns `itr1Draft` in ITR-1 layout, scope-guarded to ITR-1 (refuses ITR-2/3/4), labelled DRAFT (validate in portal offline utility). Downloads for both the filing sheet and the ITR-1 JSON are in the Filing Kit (/tools/filing).
- Suite: 267 tests, tsc clean, 63 pages.


## Founder to-dos (dev notes — items code can't do)
- One live ₹399 payment test → confirm Cashfree webhook log shows 200, plan auto-activates.
- Sign into /admin with the 6-digit code once (closes Batch 73 verification).
- Register webhook URL in Cashfree if not done: https://taxsense.mnbresearch.com/api/pay/webhook
- Optional: add ANTHROPIC_API_KEY or LLM_FALLBACK_* for a second AI engine.
- file_upload MCP tool broken — use JS injection workaround (see push workflow). NEW: raw.githubusercontent fetch + in-browser patch + hash-check is the cheapest edit path for existing files.
- /tmp sandbox gets wiped; re-clone when missing.
