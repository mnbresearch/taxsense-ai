# MNB master-prompt requirements — TaxSense status (13 Oct 2026)

| # | Requirement | Status | Where / notes |
|---|---|---|---|
| 1 | Local repo preserved | Implemented | `~/Documents/Claude Mac 1 /taxsense-ai` (fresh clone of GitHub main; no prior local copy existed). No git credentials on the Mac: pushes go via GitHub web upload. |
| 2 | Architecture inventory & plan | Implemented | `docs/OPERATIONS.md` |
| 3 | Versioned API + OpenAPI | Implemented | `/api/v1/*`, `/api/v1/openapi.json`, `/developers` |
| 3 | Signed webhooks | Implemented | `profile.saved/deleted`, `plan.activated`; HMAC, retries, SSRF guard |
| 4 | API keys (256-bit, hashed, scopes, expiry, rotate/revoke, audit, UI) | Implemented | `src/lib/api/*`, `/developers`, `/admin` |
| 4 | "Organization isolation" | Adapted | TaxSense has no organisations — the tenant is the account; Business-plan clients are profiles inside one account. Isolation is per account, tested. |
| 5 | Cross-product integration | Implemented (TaxSense side) | Service keys (calculation-only). Other products must store their own key; no shared DB. `docs/INTEGRATIONS.md` |
| 6 | Browser automation | Not applicable | TaxSense needs none: everything is first-party server/API. No browser profile access. |
| 7 | Analytics + dashboard | Implemented | `product_events`, `/admin` funnel; GPC/DNT/opt-out; 13-month retention; erased with the account |
| 8 | Abandoned checkout (email) | Implemented, **off by default** | Admin toggles; dry-run default; consent record required (`payments.consent_at`) |
| 8 | WhatsApp | Blocked | Needs a WhatsApp Business account, approved template, and a per-order phone opt-in. Interface: `src/lib/messaging/whatsapp.ts` |
| 9 | Security hardening | Implemented | Earlier passes (PR #1–#3) + this pass: key auth, scope checks, rate limits, size limits, SSRF guard, no secrets logged, CORS closed |
| 10 | DB integrity, backups | Implemented / documented | Additive idempotent migration, RLS on every table, `docs/OPERATIONS.md` backup + rollback |
| 11 | Admin UX | Implemented | `/admin` → funnel, follow-ups, all keys, service keys |
| 12 | Tests | Implemented | `tests/api-platform.test.ts`, `tests/webhooks-analytics-followups.test.ts` (+ existing suites) |
| — | Error monitoring (Sentry) | Blocked | Needs a Sentry account/DSN |
