# TaxSense AI — integration contract (API v1)

Live reference: https://taxsense.mnbresearch.com/developers · machine-readable: `/api/v1/openapi.json`.

## Who can call what

| Caller | Credential | Can do | Cannot do |
|---|---|---|---|
| A TaxSense user's own software | **User key** (`kind=user`), created at /developers | compute, parse documents, deadlines, **their own** profiles, **their own** webhooks — per granted scope | anything belonging to another account |
| Another MNB Research product (Cortex, AuditFlow, CRM, …) | **Service key** (`kind=service`), created by an admin in /admin → "Service keys" | `compute`, `documents:parse`, `deadlines:read` | any user data (profiles, webhooks) — refused with 403 even if a scope were added |

TaxSense does **not** share a database or login system with other MNB products. Each product authenticates with its own key; there is no direct DB access.

## Keys

Format `tsk_<16 hex id>_<43 base64url secret>` (256-bit secret). Only a SHA-256 hash is stored; the secret is shown once.
Lifecycle: create (1–365 day expiry, default 90) → rotate (new secret; old one retires immediately or after ≤24 h overlap) → revoke (immediate). Admins can revoke any key.
Limits: free user 30/min + 500/day; paid user 120/min + 10,000/day; service 300/min + 50,000/day. Every key's daily usage is counted.

## Stable identifiers & data mapping

| TaxSense field | Meaning | Mapping notes |
|---|---|---|
| `profile.id` (uuid) | Saved profile | Stable for the life of the profile; use as foreign key |
| `profile.label` | Client/profile name within an account | Unique per account + FY; `POST /profiles` upserts by label (idempotent) |
| `financialYear` | `FY2025-26` | Assessment year `AY2026-27` |
| `regimes.old/new.totalTax` | ₹, after rebate/surcharge/cess | Integers (₹, rounded per s.288A/288B) |
| `TaxSense-Delivery` header | Webhook delivery id | Use as the idempotency key on the receiving side |

## Webhooks

Events: `profile.saved`, `profile.deleted`, `plan.activated` (emitted only from the server-verified Cashfree payment path), plus `webhook.test`.
Signature `TaxSense-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + "." + body)>`; reject if older than 5 minutes.
Retries: 3 attempts (0 s, 2 s, 8 s) for network errors, 408, 429, 5xx; one more pass in the daily cron for 24 h. Other 4xx = receiver rejected, not retried. Redirects are never followed.
SSRF protection: https on port 443 only, no credentials in URL, hostname must resolve only to public addresses (checked at registration **and** before every attempt), and never TaxSense itself.
Known limit: DNS can change between our check and the connection (rebinding window of milliseconds); Node's fetch doesn't let us pin the resolved IP without adding a dependency.

## Health & failures

`GET /api/v1/health` → `{status, components.keyStore}`; 503 when the key store is unreachable.
Errors are `{ error: { code, message }, requestId }`; quote `requestId` when reporting issues.
Backward compatibility: v1 only gains optional fields; breaking changes will ship as `/api/v2`.
