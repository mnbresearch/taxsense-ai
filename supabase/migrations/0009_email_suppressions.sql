-- Batch 50: unsubscribe suppression list — campaign sends skip these addresses.
create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribed',
  created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
-- service-role only; the unsubscribe endpoint writes via the server.
