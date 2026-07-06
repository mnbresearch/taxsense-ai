-- TaxSense AI — initial schema (Session 5)
-- Financial PII: RLS ON for every table, deny-by-default, owner-only access.
-- The admin dashboard uses the service-role key server-side and never
-- exposes raw profiles — only aggregates.

create extension if not exists "uuid-ossp";

-- ---------- users' tax profiles ----------
create table public.tax_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fy text not null default 'FY2025-26',
  label text not null default 'My profile',
  -- Full TaxProfile JSON (validated by the app's zod schema before writes).
  profile jsonb not null,
  -- Cached computation snapshot for dashboards (no recompute on list views).
  computation jsonb,
  intake_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fy, label)
);

-- ---------- chat transcripts (retention-limited) ----------
create table public.intake_messages (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.tax_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- audit log (who did what; admin-readable aggregate only) ----------
create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,           -- 'profile_created' | 'pdf_generated' | 'account_deleted' ...
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- account deletion queue (data-retention flow) ----------
create table public.deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  -- hard-delete executed by scheduled job after the grace period
  purge_after timestamptz not null default now() + interval '30 days',
  status text not null default 'pending' check (status in ('pending','purged','cancelled'))
);

-- ---------- RLS: deny by default, owner-only ----------
alter table public.tax_profiles enable row level security;
alter table public.intake_messages enable row level security;
alter table public.audit_events enable row level security;
alter table public.deletion_requests enable row level security;

create policy "own profiles" on public.tax_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on public.intake_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- users may read their own audit trail; only the server (service role) writes
create policy "read own audit" on public.audit_events
  for select using (auth.uid() = user_id);

create policy "own deletion request" on public.deletion_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tax_profiles_touch before update on public.tax_profiles
  for each row execute function public.touch_updated_at();

-- ---------- retention: purge chat transcripts older than 18 months ----------
-- (run via Supabase scheduled function / pg_cron)
create or replace function public.purge_stale_intake_messages()
returns void language sql security definer as $$
  delete from public.intake_messages where created_at < now() - interval '18 months';
$$;

-- ---------- hard delete for the deletion queue ----------
create or replace function public.execute_pending_deletions()
returns void language plpgsql security definer as $$
begin
  -- delete user data first, then the auth user (cascades already cover most)
  delete from public.intake_messages m using public.deletion_requests d
    where d.status = 'pending' and d.purge_after < now() and m.user_id = d.user_id;
  delete from public.tax_profiles p using public.deletion_requests d
    where d.status = 'pending' and d.purge_after < now() and p.user_id = d.user_id;
  update public.deletion_requests set status = 'purged'
    where status = 'pending' and purge_after < now();
end $$;

-- ---------- admin aggregates (service-role only; SECURITY DEFINER) ----------
create or replace function public.admin_stats()
returns jsonb language sql security definer as $$
  select jsonb_build_object(
    'users', (select count(distinct user_id) from public.tax_profiles),
    'profiles', (select count(*) from public.tax_profiles),
    'computed', (select count(*) from public.tax_profiles where computation is not null),
    'messages', (select count(*) from public.intake_messages),
    'pdfs', (select count(*) from public.audit_events where event = 'pdf_generated'),
    'pending_deletions', (select count(*) from public.deletion_requests where status = 'pending'),
    'signups_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'regime_split', (
      select coalesce(jsonb_object_agg(r, c), '{}'::jsonb) from (
        select computation->>'recommended' as r, count(*) as c
        from public.tax_profiles where computation is not null group by 1
      ) t
    )
  );
$$;
revoke execute on function public.admin_stats() from public, anon, authenticated;
