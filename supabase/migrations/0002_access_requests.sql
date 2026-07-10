-- Access requests (marketing leads) — batch 10.
-- Locked down: no anon/authenticated policies; only the service role
-- (API route) writes, only the admin endpoint reads.
create table public.access_requests (
  id bigint generated always as identity primary key,
  email text not null,
  name text,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);
create unique index access_requests_email_uidx on public.access_requests (lower(email));
alter table public.access_requests enable row level security;
