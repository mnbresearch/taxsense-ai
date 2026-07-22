-- Batch 48: Email Studio — reusable templates + open tracking.
create table if not exists public.email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;
-- service-role only (admin APIs); no user-facing policies.

alter table public.email_log add column if not exists track_id uuid default uuid_generate_v4();
alter table public.email_log add column if not exists template_name text;
alter table public.email_log add column if not exists opened_at timestamptz;
create index if not exists email_log_track_idx on public.email_log (track_id);
create index if not exists email_log_template_idx on public.email_log (template_name);
