-- Batch 16: deadline reminder subscriptions (D-7 / D-1 nudge emails via cron).
create table public.tax_reminders (
  id bigint generated always as identity primary key,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index tax_reminders_email_uidx on public.tax_reminders (lower(email));
alter table public.tax_reminders enable row level security;
