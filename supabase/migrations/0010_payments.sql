-- Batch 82 — online payments ledger (Cashfree).
-- Idempotency + reconciliation for webhook/status fulfilment.
create table if not exists public.payments (
  order_id text primary key,
  email text not null,
  plan_key text,
  amount numeric,
  status text not null default 'created', -- created | paid | failed
  cf_payment_id text,
  via text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_email_idx on public.payments (email);
alter table public.payments enable row level security;
-- Service-role only: no policies — deny by default for anon/authenticated.
