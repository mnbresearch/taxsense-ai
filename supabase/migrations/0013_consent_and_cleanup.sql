-- 0013 — consent + privacy cleanup (portfolio audit 2026-10-04). Safe to run more than once.

-- 1. Explicit marketing opt-in. Everyone existing defaults to NOT opted in:
--    the weekly digest only goes to people who tick the new optional box.
alter table public.access_requests add column if not exists marketing_opt_in boolean not null default false;
alter table public.access_requests add column if not exists consent_at timestamptz;

-- 2. Old chat transcripts may contain pasted Form 16 text (PAN, TAN, employer
--    address). The app no longer stores transcripts at all; remove what's left.
delete from public.intake_messages;

-- 3. Audit trail: keep event names, drop personal data that older code put in meta.
update public.audit_events
   set meta = meta - 'email' - 'income' - 'opportunity'
 where meta ?| array['email','income','opportunity']
   and event in ('tax_check_lead','pay_order_created');

-- 4. Test / reserved-domain addresses (Resend rejects these with 422).
delete from public.tax_reminders   where email ~* '@([a-z0-9-]+\.)*(example\.(com|org|net)|test|invalid|localhost)$';
delete from public.access_requests where email ~* '@([a-z0-9-]+\.)*(example\.(com|org|net)|test|invalid|localhost)$' and status <> 'active';
