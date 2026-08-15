# TaxSense AI — Session Handoff (through Batch 80)

**Live:** https://taxsense.mnbresearch.com (Vercel, auto-deploys from `main`; old taxsense-ai.vercel.app 308-redirects here)
**Entity:** ABROBOT TECHNOLOGIES PRIVATE LIMITED (MNB Research). Founder: Mridul Nanda (mridulnanda2004@gmail.com; leads inbox mnbgotyou@gmail.com).

## Stack
Next.js 14 App Router + TS + Tailwind · Supabase (project rsuevtdelaqjjqtyiosd): Postgres, RLS deny-by-default, magic-link + OTP auth · Resend (verified domain updates.mnbresearch.com) · Vercel Hobby (bom1), cron 02:00 UTC daily.
Tests: `npx vitest run` — 22 files / 163 tests. Always run tsc + vitest + next build before pushing.

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

## Known state / remaining
- Cosmetic: taxsense-ai.vercel.app strings inside Quiz.tsx, CalendarTool.tsx, InterestCalculator.tsx, lib/pdf/rentReceipts.ts (UI links; 308 covers them).
- Founder to-dos: test OTP sign-in on desktop, confirm /admin 200 (Batch 73 close-out), rotate Groq key someday, call leads.
- file_upload MCP tool broken ("paths… undefined") — use JS injection workaround above.
- /tmp sandbox gets wiped; re-clone when missing.
