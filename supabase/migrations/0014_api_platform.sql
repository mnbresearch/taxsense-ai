-- 0014 — API platform, product analytics, checkout follow-ups.
-- Additive and safe to run more than once. No existing data is changed.
-- Every new table: RLS enabled with NO policies → only the server
-- (service role) can read/write. The app enforces ownership in code.

-- ---------- API keys ----------
create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  key_id        text not null unique,                 -- public identifier embedded in the key
  user_id       uuid references auth.users(id) on delete cascade,  -- owner (null only for demo)
  kind          text not null default 'user' check (kind in ('user','service')),
  name          text not null,
  scopes        text[] not null default '{}',
  secret_hash   text not null,                        -- SHA-256 of the 256-bit secret; plaintext never stored
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  rotated_from  uuid references public.api_keys(id) on delete set null
);
create index if not exists api_keys_user_idx on public.api_keys (user_id);
alter table public.api_keys enable row level security;

-- Daily per-key request counter (analytics + abuse review).
create table if not exists public.api_usage_daily (
  key_uuid uuid not null references public.api_keys(id) on delete cascade,
  day      date not null,
  requests int  not null default 0,
  primary key (key_uuid, day)
);
alter table public.api_usage_daily enable row level security;

create or replace function public.api_usage_hit(p_key uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.api_usage_daily(key_uuid, day, requests) values (p_key, current_date, 1)
  on conflict (key_uuid, day) do update set requests = public.api_usage_daily.requests + 1;
$$;
revoke execute on function public.api_usage_hit(uuid) from public, anon, authenticated;

-- ---------- Outbound webhooks ----------
create table if not exists public.webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  events      text[] not null,
  secret_salt text not null,             -- signing secret = HMAC(server master, salt); secret itself never stored
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists webhook_endpoints_user_idx on public.webhook_endpoints (user_id);
alter table public.webhook_endpoints enable row level security;

create table if not exists public.webhook_deliveries (
  id            uuid primary key default gen_random_uuid(),
  endpoint_id   uuid not null references public.webhook_endpoints(id) on delete cascade,
  event         text not null,
  payload       jsonb not null,
  status        text not null default 'pending' check (status in ('pending','delivered','failed')),
  attempts      int not null default 0,
  last_status   int,
  last_error    text,
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz
);
create index if not exists webhook_deliveries_pending_idx on public.webhook_deliveries (status, created_at);
alter table public.webhook_deliveries enable row level security;

-- ---------- Product analytics ----------
create table if not exists public.product_events (
  id          bigint generated always as identity primary key,
  event       text not null,
  occurred_at timestamptz not null default now(),
  anon_id     text,           -- random per-browser id (first-party, no cookies); null for server events
  user_id     uuid references auth.users(id) on delete set null,
  source      text not null default 'web' check (source in ('web','server','api')),
  path        text,
  props       jsonb not null default '{}'
);
create index if not exists product_events_time_idx on public.product_events (occurred_at);
create index if not exists product_events_event_time_idx on public.product_events (event, occurred_at);
create index if not exists product_events_user_idx on public.product_events (user_id);
alter table public.product_events enable row level security;

create or replace function public.purge_old_product_events()
returns void language sql security definer set search_path = public as $$
  delete from public.product_events  where occurred_at < now() - interval '13 months';
  delete from public.api_usage_daily where day < current_date - 400;
  delete from public.webhook_deliveries where created_at < now() - interval '90 days';
$$;
revoke execute on function public.purge_old_product_events() from public, anon, authenticated;

-- ---------- Checkout follow-ups ----------
alter table public.payments add column if not exists consent_at timestamptz;

create table if not exists public.checkout_followups (
  order_id   text primary key references public.payments(order_id) on delete cascade,
  email      text not null,
  channel    text not null default 'email',
  status     text not null check (status in ('sent','dry_run','skipped','failed')),
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists checkout_followups_email_idx on public.checkout_followups (email, created_at);
alter table public.checkout_followups enable row level security;

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings(key, value)
  values ('checkout_followups', '{"enabled": false, "dryRun": true, "delayHours": 3, "maxPerRun": 50}')
  on conflict (key) do nothing;

-- ---------- Account erasure now also covers the new tables ----------
create or replace function public.execute_pending_deletions()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare r record;
begin
  for r in
    select d.user_id, lower(u.email) as email
    from public.deletion_requests d
    left join auth.users u on u.id = d.user_id
    where d.status = 'pending' and d.purge_after < now()
  loop
    delete from public.intake_messages where user_id = r.user_id;
    delete from public.pdf_history     where user_id = r.user_id;
    delete from public.tax_profiles    where user_id = r.user_id;
    delete from public.audit_events    where user_id = r.user_id;
    -- analytics: the user's events and any anonymous events from browsers linked to them
    delete from public.product_events where anon_id in
      (select distinct anon_id from public.product_events where user_id = r.user_id and anon_id is not null);
    delete from public.product_events  where user_id = r.user_id;
    delete from public.api_keys        where user_id = r.user_id;   -- cascades usage
    delete from public.webhook_endpoints where user_id = r.user_id; -- cascades deliveries
    if r.email is not null then
      delete from public.tax_reminders   where lower(email) = r.email;
      delete from public.email_log       where lower(to_email) = r.email;
      delete from public.access_requests where lower(email) = r.email;
      delete from public.checkout_followups where lower(email) = r.email;
      insert into public.email_suppressions(email, reason) values (r.email, 'account_deleted')
        on conflict (email) do update set reason = 'account_deleted';
    end if;
    insert into public.audit_events(event, meta) values ('account_purged', jsonb_build_object('at', now()));
    delete from auth.users where id = r.user_id;
  end loop;
end $$;
revoke execute on function public.execute_pending_deletions() from public, anon, authenticated;

-- Resolve an account id from an email (server-only; used to route plan.activated webhooks).
create or replace function public.user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;

-- Funnel/activation aggregates for the admin dashboard (server-only).
create or replace function public.analytics_summary(p_since timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with ev as (select * from public.product_events where occurred_at >= p_since)
  select jsonb_build_object(
    'visitors',            (select count(distinct anon_id) from ev where event = 'page_view' and anon_id is not null),
    'page_views',          (select count(*) from ev where event = 'page_view'),
    'pricing_visitors',    (select count(distinct anon_id) from ev where event = 'page_view' and path = '/pricing' and anon_id is not null),
    'app_visitors',        (select count(distinct anon_id) from ev where event = 'page_view' and path = '/app' and anon_id is not null),
    'plan_selected',       (select count(distinct coalesce(anon_id, user_id::text)) from ev where event = 'plan_selected'),
    'checkout_started',    (select count(*) from public.payments where created_at >= p_since),
    'payments_succeeded',  (select count(*) from public.payments where created_at >= p_since and status = 'paid'),
    'payments_failed',     (select count(*) from public.payments where created_at >= p_since and status = 'failed'),
    'checkout_abandoned',  (select count(*) from public.payments where created_at >= p_since and status = 'created' and created_at < now() - interval '2 hours'),
    'revenue_inr',         (select coalesce(sum(amount), 0) from public.payments where created_at >= p_since and status = 'paid'),
    'login_attempts',      (select count(*) from ev where event = 'login_attempt'),
    'logins',              (select count(*) from ev where event = 'login_success'),
    'login_failures',      (select count(*) from ev where event = 'login_failed'),
    'signups',             (select count(*) from ev where event = 'signup'),
    'onboarding_completed',(select count(distinct coalesce(anon_id, user_id::text)) from ev where event = 'onboarding_completed'),
    'activated_users',     (select count(distinct e.user_id) from ev e where e.event = 'feature_used' and e.user_id in (select user_id from ev where event = 'signup')),
    'renewals',            (select count(*) from ev where event = 'subscription_activated' and props->>'renewal' = 'true'),
    'cancellations',       (select count(*) from ev where event = 'subscription_cancelled'),
    'features',            coalesce((select jsonb_object_agg(f, n) from (select props->>'feature' f, count(*) n from ev where event = 'feature_used' group by 1) x), '{}'::jsonb),
    'top_pages',           coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', n)) from (select path, count(*) n from ev where event = 'page_view' group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'top_referrers',       coalesce((select jsonb_agg(jsonb_build_object('host', h, 'visits', n)) from (select props->>'referrer_host' h, count(*) n from ev where event = 'page_view' and props ? 'referrer_host' group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'api_requests',        (select coalesce(sum(requests), 0) from public.api_usage_daily where day >= p_since::date),
    'api_keys_active',     (select count(*) from public.api_keys where revoked_at is null and expires_at > now()),
    'api_active_keys_used',(select count(distinct key_uuid) from public.api_usage_daily where day >= p_since::date),
    'webhook_deliveries',  (select jsonb_build_object('delivered', count(*) filter (where status = 'delivered'), 'failed', count(*) filter (where status = 'failed')) from public.webhook_deliveries where created_at >= p_since),
    'daily',               coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visitors', v, 'signups', s) order by d) from (
                              select occurred_at::date d,
                                     count(distinct anon_id) filter (where event = 'page_view') v,
                                     count(*) filter (where event = 'signup') s
                              from ev group by 1) x), '[]'::jsonb)
  );
$$;
revoke execute on function public.analytics_summary(timestamptz) from public, anon, authenticated;
