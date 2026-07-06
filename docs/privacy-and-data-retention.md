# Privacy & data-retention design (Session 5)

*Engineering sketch of what the eventual privacy policy must cover — not the legal document itself. Aligned to India's DPDP Act, 2023 framing (consent, purpose limitation, data-principal rights).*

## What we hold, and why

| Data | Purpose | Where | Retention |
|---|---|---|---|
| Email (auth) | account access | Supabase Auth | until account deletion |
| Tax profile JSON (income, deductions) | computation & PDF | `tax_profiles` (RLS: owner-only) | until deletion request + 30-day grace |
| Chat transcripts | continuity of intake, quality | `intake_messages` (RLS: owner-only) | auto-purged after 18 months (`purge_stale_intake_messages`) |
| Audit events (event names only, no amounts) | security, metrics | `audit_events` | 24 months |

**We never hold:** PAN, Aadhaar, bank account numbers, Form 16 uploads (v1 doesn't ingest documents), passwords (magic-link auth).

## Technical enforcement (already implemented)

- **RLS deny-by-default** on every table; owner-only policies (`0001_init.sql`). The anon key can never read another user's rows even if the app layer is buggy.
- **Admin sees aggregates only** — the dashboard calls `admin_stats()` (SECURITY DEFINER, service-role only), which returns counts, never rows.
- **LLM data path**: messages go to the inference provider (Groq/Anthropic) for extraction only; policy must disclose the subprocessors and state that API data isn't used for training (both providers' API terms).
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
