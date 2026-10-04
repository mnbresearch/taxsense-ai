# Privacy & data-retention design (Session 5)

*Engineering sketch of what the eventual privacy policy must cover — not the legal document itself. Aligned to India's DPDP Act, 2023 framing (consent, purpose limitation, data-principal rights).*

## What we hold, and why

| Data | Purpose | Where | Retention |
|---|---|---|---|
| Email (auth) | account access | Supabase Auth | until account deletion |
| Tax profile JSON (income, deductions) | computation & PDF | `tax_profiles` (RLS: owner-only) | until deletion request + 30-day grace |
| Chat transcripts | — | not stored (since Oct 2026; migration 0013 removed old rows) | — |
| Leads (email, name, phone, plan, consent time, marketing opt-in) | reply to the request; weekly digest only if opted in | `access_requests` | until deletion / unsubscribe |
| Payment ledger (order id, plan, amount, email) | accounting & GST | `payments` | statutory period; unlinked on account deletion |
| Audit events | security, metrics. Lead/order events carry no email or income; admin actions and payment fulfilment record the affected email for accountability | `audit_events` | 24 months / until account deletion |

**We never hold:** PAN, TAN, Aadhaar, bank account numbers, card data (Cashfree-hosted checkout), passwords (OTP/magic-link auth). Pasted Form 16 / AIS text is parsed in memory by the deterministic importer (`src/lib/intake/docImport.ts`) and discarded; it never reaches an LLM. PAN/TAN/Aadhaar are redacted from every chat turn before inference (`src/lib/intake/pii.ts`).

## Technical enforcement (already implemented)

- **RLS deny-by-default** on every table; owner-only policies (`0001_init.sql`). The anon key can never read another user's rows even if the app layer is buggy.
- **Admin sees aggregates only** — the dashboard calls `admin_stats()` (SECURITY DEFINER, service-role only), which returns counts, never rows.
- **LLM data path**: typed messages (ID numbers redacted, documents excluded) go to Groq, with Anthropic as backup, for extraction only. `LLM_FALLBACK_URL` must stay unset unless that provider is added to /privacy first.
- **Right to access/portability**: `GET /api/account` exports everything as JSON.
- **Right to erasure**: `DELETE /api/account` queues deletion; 30-day grace (cancel by signing in), then `execute_pending_deletions()` hard-purges. Backups age out on the provider's schedule (~30 days) — policy must say so.

## What the legal policy must additionally cover

1. Data fiduciary identity & grievance officer contact (DPDP requirement).
2. Consent language at signup: purpose = tax computation & document generation, nothing else; no ad targeting; no selling data.
3. Subprocessor list: Supabase (hosting, likely AWS ap-south-1 — choose Mumbai region at project creation), Vercel (edge/app), Groq/Anthropic (inference).
4. Breach-notification commitment and channel.
5. Children: service not offered to under-18s.
6. Cookie disclosure: auth cookies only, no third-party trackers.
7. Disclaimer separation: computations are informational; filing responsibility stays with the taxpayer (mirrors the disclaimer already on the PDF footer).
