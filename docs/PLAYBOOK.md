# TaxSense AI — The Complete Playbook

*An MNB Research product, in collaboration with Abrobot.ai · Live at **taxsense-ai.vercel.app** · FY 2025-26 (AY 2026-27)*

---

## 1. What TaxSense AI is

TaxSense AI is an AI-native income-tax filing copilot for India. Instead of a 40-field form, you *talk* to it — "I earn around 80k a month, pay 25k rent in Pune, put 1.5L in PPF" — and it structures your income, computes your tax under **both** the old and new regime with transparent, section-cited math, quantifies the deduction moves you're missing in rupees, plans your advance-tax calendar, tells you which ITR form to file, and hands you a professional filing-summary PDF.

**The one-sentence pitch:** the only tax tool you talk to — it finds the regime and the deductions that save you the most, and shows you the math.

---

## 2. How it works (the user journey)

**Step 1 — Talk.** Open taxsense-ai.vercel.app and hit "Start the conversation." The copilot asks how you earn, one question at a time, like a sharp CA would. Messy answers are fine: "around 80k a month plus a bonus sometimes" is a complete answer. Estimates are accepted and flagged for later verification — never nagged about.

**Step 2 — See.** The moment it knows enough, the right-hand panel computes live: total liability under the old regime AND the new regime, effective rates, the recommendation, and ranked "moves that lower your tax" with the exact ₹ saved by each (e.g., "₹50,000 into NPS 80CCD(1B) saves ₹15,600").

**Step 3 — Plan.** Switch to the **Planner** tab: drag sliders for 80C, NPS, health insurance, and rent, and watch both regimes recompute in real time. Below it: your advance-tax installment calendar (with interest warnings if you'd skip it) and the ITR form you should file, with reasons.

**Step 4 — File.** Download the filing-summary PDF: income breakdown, deductions claimed, both-regime computation, the recommendation, audit notes explaining *how* every number was computed, flagged estimates to verify, and a document checklist tailored to your exact situation. File on the government portal yourself, or hand the PDF to your CA — they start from a clean file instead of a shoebox of screenshots.

### Under the hood, one conversation turn works like this

1. Your message goes to the **extraction LLM** (Groq llama-3.3-70b by default), which returns a strict-JSON partial profile update — amounts annualised ("80k a month" → ₹9,60,000/yr), sections routed (PPF → 80C), denials remembered ("no house" stops those questions).
2. A **zod schema validates** every extraction — a hallucinated or malformed response can never corrupt your profile; it degrades to a clarifying question instead.
3. The **deterministic merge engine** folds the update into your running profile and decides the highest-value next question.
4. The **pure-function rules engine** recomputes both regimes instantly — no LLM is ever involved in the tax math. The AI listens; the engine calculates.

---

## 3. How to log in (and what works without logging in)

**No login needed to try it.** The entire product — chat, computation, planner, PDF — works anonymously in demo mode. Your data stays in the browser session.

**Logging in (when Supabase env is configured):**

1. Click **Save** on your computation → you'll be asked to sign in.
2. Enter your email → you receive a **magic link** (passwordless — there is no password to create, remember, or leak).
3. Click the link → you're signed in, and your profile + computation persist across devices.

**Your data rights, built in:** `GET /api/account` exports everything TaxSense holds about you as JSON (portability). `DELETE /api/account` queues permanent deletion with a 30-day grace window (sign back in to cancel), after which a scheduled job hard-purges every row. Chat transcripts auto-delete after 18 months regardless.

**Admin access:** `/admin` is restricted to emails listed in the `ADMIN_EMAILS` environment variable. Admins see **aggregates only** — user counts, computed-profile counts, PDFs generated, regime split, pending deletions. Raw financial data is never visible to admins; row-level security enforces this at the database layer, not just the app layer.

---

## 4. The environment (what it runs on)

| Layer | Technology | Why |
|---|---|---|
| Frontend + API | **Next.js 14** (App Router, TypeScript) on **Vercel** (Mumbai edge, `bom1`) | One deployable unit; serverless scales to zero; free tier covers beta |
| Tax engine | Pure-function **TypeScript module** — zero dependencies, zero I/O | Auditable, deterministic, 60 hand-verified unit tests |
| Conversational AI | **Groq** (llama-3.3-70b-versatile) primary · **Claude (haiku-4-5)** automatic fallback · deterministic **mock mode** with zero keys | Sub-second turns at ~₹1.2 per completed intake; accuracy insurance via fallback |
| Database + Auth | **Supabase** (Postgres 15 + magic-link auth), region **ap-south-1 Mumbai** | Financial PII stays in-country; RLS deny-by-default |
| PDF generation | **pdf-lib**, server-side | No headless browser needed on serverless |
| CI/CD | **GitHub → Vercel** auto-deploy on push to `main` (repo: `mnbresearch/taxsense-ai`) | Every commit ships; instant rollback |
| Monitoring | `/api/health` — runs a live engine self-test (₹12.75L anchor case) on every call | Catches constant-corruption instantly |
| Abuse protection | Per-IP token-bucket rate limits on chat (15/min), compute (60/min), PDF (6/min) | Blunts free-tier abuse |

**Security posture:** every database table has row-level security with owner-only policies — even a compromised app layer cannot read another user's rows. The service-role key exists only in server env vars. No PAN, Aadhaar, bank numbers, or document uploads are collected in v1. Passwords don't exist (magic links). The admin surface is aggregate-only by construction (`SECURITY DEFINER` SQL function).

---

## 5. Everything it has (the full feature inventory)

### Conversational intake
- Natural-language income capture: salary, house property (self-occupied/let-out), capital gains (STCG/LTCG, equity/other), business & professional (incl. presumptive 44AD/ADA), other sources
- Annualisation and Indian-notation parsing: "80k a month", "12 LPA", "1.5 lakh", "2 cr"
- Estimate handling — "around" amounts accepted and flagged on the final PDF for verification
- Explicit-denial memory — "no house" permanently stops that line of questioning
- "I don't know" support — tells you exactly where the number lives (payslip, Form 16 Part B, AIS, broker P&L)
- Zod-validated extractions — hallucination-proof profile
- Zero-key demo mode — the whole product works before any API key exists

### The rules engine (FY 2025-26, Finance Act 2025 — every figure source-verified)
- Both regimes computed in full: new slabs (0–4L nil → 24L+ 30%) and old slabs (with senior/super-senior exemptions)
- Standard deductions (₹75k new / ₹50k old), professional tax, HRA exemption (metro/non-metro, Rule 2A)
- s.87A rebate: ₹60k new (≤₹12L, with **marginal relief** just above) / ₹12.5k old — special-rate gains correctly excluded
- Capital gains: STCG 111A @20%, LTCG 112A @12.5% with ₹1.25L exemption, other LTCG @12.5%; **unused basic-exemption adjustment** for residents
- House property: 30% standard deduction, let-out interest in full, SOP interest capped ₹2L (old only), s.71(3A) ₹2L loss set-off cap, new-regime set-off denial
- Chapter VI-A with statutory caps: 80C, 80CCD(1B), 80CCD(2) (10%/14% employer NPS — both regimes), 80D (senior tiers), 80E, 80G, 80TTA/80TTB — and the rule that VI-A can't offset special-rate gains
- Surcharge: full bands to 37% (old) / capped 25% (new), the 15% cap on capital-gains surcharge, and marginal relief
- 4% cess, s.288A/B rounding
- Every rule carries a code comment citing its section — the engine is an auditable document

### The optimizer
- Regime recommendation with exact ₹ savings
- Ranked what-if moves: 80C top-up, NPS 80CCD(1B), 80D self + parents — each quantified ("saves ₹X") and scored by savings-per-rupee-invested
- Equity LTCG harvesting flag when you have unused ₹1.25L exemption headroom
- N-variation simulation engine underneath — arbitrary profile mutations, ranked

### Planning tools
- **What-if Planner tab** — live sliders (80C / NPS / 80D / rent) with real-time both-regime recompute
- **Advance-tax calendar** — s.211 installments (15 Jun 15% → 15 Mar 100%), presumptive single-installment schedule, senior-citizen exemption, and estimated s.234B/234C interest if you skip
- **ITR form recommender** — ITR-1/2/3/4 with reasons, including the AY 2025-26 change allowing equity LTCG ≤ ₹1.25L inside ITR-1

### Documents & data
- Filing-summary PDF: income breakdown, deductions, both-regime table, recommendation, quantified moves, audit notes, flagged estimates, adaptive document checklist
- Profile export/import as JSON — portable, re-loadable
- Full account data export + deletion flow (DPDP-aligned)

### Operations
- Admin dashboard (aggregates only) with operational runbook
- `/api/health` engine self-test endpoint
- Per-IP rate limiting on all expensive routes
- 60 unit tests with hand-computed expected values; CI-ready

---

## 6. What it deliberately does NOT do (v1 scope honesty)

- No e-filing/ERI submission — output is a filing-ready summary, not an ITR upload (that's ClearTax's fortress; we win the intake and the advice)
- No broker/bank integrations — paste or state your capital-gains summary
- Resident individuals only: NRI/DTAA, foreign assets, F&O business treatment, AMT, and clubbing are flagged to the user, never guessed
- Not a substitute for professional advice — the PDF says so, and the product positions CAs as complementary

---

## 7. Operating it (owner's runbook)

- **Enable real AI:** add `GROQ_API_KEY` (free at console.groq.com) in Vercel → Settings → Environment Variables → redeploy. Optional `ANTHROPIC_API_KEY` activates the accuracy fallback.
- **Enable accounts:** add the three Supabase keys + `ADMIN_EMAILS` (see `.env.example`). Run the SQL migration (already applied to your Mumbai project). Set the Vercel domain as Site URL in Supabase Auth settings.
- **Scheduled jobs (Supabase pg_cron):** daily `select public.execute_pending_deletions();` · monthly `select public.purge_stale_intake_messages();`
- **Year rollover:** when Budget 2026 figures are notified, update `src/lib/tax-engine/constants.ts` — the engine is year-agnostic by design; the tests tell you instantly if a figure is inconsistent.
- **Deploys:** push to `main` on `mnbresearch/taxsense-ai` → Vercel builds automatically. Instant rollback from the Vercel dashboard.
- **Health:** check `taxsense-ai.vercel.app/api/health` — `"status":"ok"` means the engine self-test passed in production.

---

*© 2026 MNB Research · in collaboration with Abrobot.ai · Computed under the Income-tax Act, 1961 as amended by Finance Act 2025.*
