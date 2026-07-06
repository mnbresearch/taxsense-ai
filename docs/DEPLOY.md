# Deploying TaxSense AI (free tier, ~10 minutes)

The app runs in three modes, automatically:
- **Zero config** → demo mode (mock LLM, in-memory storage) — works the moment `npm run dev` starts.
- **+ GROQ_API_KEY** → real conversational intake.
- **+ Supabase env** → auth, persistence, RLS, admin dashboard.

## 1. Supabase (free tier)

1. Create a project at supabase.com → **region: Mumbai (ap-south-1)** (financial PII stays in-country).
2. SQL Editor → paste & run `supabase/migrations/0001_init.sql`.
3. Authentication → Providers → enable **Email (magic link)**.
4. Settings → API → copy `URL`, `anon` key, `service_role` key.

## 2. Groq (free tier, no card)

1. console.groq.com → create API key. Free tier (30 RPM, 1k+ req/day) covers a beta comfortably.

## 3. Vercel (free tier)

1. Push this folder to a GitHub repo.
2. vercel.com → New Project → import the repo (Next.js auto-detected).
3. Environment variables (from `.env.example`):
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS=you@example.com`
4. Deploy. Set the Supabase Auth → URL Configuration → Site URL to your Vercel domain (redirects for magic links).

## 4. Post-deploy ops

- Supabase → Database → Cron (pg_cron): schedule daily `select public.execute_pending_deletions();` and monthly `select public.purge_stale_intake_messages();`
- Optional: `ANTHROPIC_API_KEY` enables the accuracy-fallback provider.
- Year rollover: update `src/lib/tax-engine/constants.ts` when Budget 2026 figures are notified, bump `fy` default.

## Local dev

```bash
npm install
npm test          # 40+ unit tests
npm run dev       # http://localhost:3000 (demo mode with no env)
npx tsx scripts/bakeoff.ts   # model bake-off (needs API keys)
```
