# TaxSense AI — operations: deploy, migrations, backups, rollback

## Architecture

Next.js 16 (App Router, React 19) on Vercel (`taxsense-ai`, region bom1) · Supabase Postgres + Auth (Mumbai region) · Resend (email) · Cashfree (payments) · Groq (LLM, Anthropic optional backup).
Daily Vercel cron → `/api/cron/keepalive` (bearer `CRON_SECRET`): DB keep-alive, account erasure, retention purges, deadline reminders, founder digest, Monday digest (opt-ins only), checkout follow-ups, webhook retries.

## Environment variables

See `.env.example` (every variable the code reads). Secrets live only in Vercel → Settings → Environment Variables, marked **Sensitive**. Never commit `.env.local`.

## Migrations

`supabase/migrations/NNNN_*.sql`, applied by pasting into Supabase → SQL Editor, in order. All are additive and idempotent (`if not exists`, `create or replace`). The app tolerates a not-yet-applied migration (features degrade with a clear message rather than erroring).

| Migration | Adds |
|---|---|
| 0012 | plan expiry, full erasure, function hardening |
| 0013 | consent columns, transcript purge |
| 0014 | API keys, usage, webhooks, product analytics, checkout follow-ups, app settings, analytics summary, erasure of the new tables |

Rollback of 0014 (only if needed — removes API keys/analytics data):
```sql
drop function if exists public.analytics_summary(timestamptz), public.user_id_by_email(text), public.purge_old_product_events(), public.api_usage_hit(uuid);
drop table if exists public.checkout_followups, public.app_settings, public.webhook_deliveries, public.webhook_endpoints, public.api_usage_daily, public.api_keys, public.product_events;
alter table public.payments drop column if exists consent_at;
-- then re-run 0012's execute_pending_deletions() definition
```

## Deploy

GitHub `mnbresearch/taxsense-ai` → Vercel auto-deploys `main`; every PR gets a preview and the GitHub Actions CI (`.github/workflows/ci.yml`: typecheck, lint, tests, build, prod dependency audit).
Rollback a bad deploy: Vercel → Deployments → previous production deployment → **Promote to Production** (instant; DB unaffected because migrations are additive).

## Backups & recovery

- **Supabase plan matters.** On the Free plan there are no downloadable/automatic restorable backups. On Pro there are daily backups (7 days); point-in-time recovery is a paid add-on. Check Supabase → Database → Backups.
- **Manual logical backup (do this at least weekly and before every migration):**
  ```bash
  # Supabase → Project Settings → Database → Connection string (session pooler, URI)
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -n public -f taxsense-$(date +%F).sql
  ```
  Store the file encrypted (it contains personal and financial data). Auth users live in the `auth` schema: add `-n auth` if you need logins too.
- **Restore** into a new Supabase project: `psql "$NEW_DB_URL" -f taxsense-YYYY-MM-DD.sql`, then point `NEXT_PUBLIC_SUPABASE_URL` / keys at it and redeploy.
- Data held **outside** Supabase: email delivery logs (Resend dashboard), payment records (Cashfree dashboard — the source of truth for money), LLM providers keep no data by API terms.

## Local development

```bash
npm ci
cp .env.example .env.local   # leave Supabase vars empty for DEMO MODE (in-memory, no infra)
npm run dev                   # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```
Demo mode needs no secrets: the API platform uses an in-memory store and a demo admin user, so `/developers` and `/api/v1/*` work end-to-end locally.
