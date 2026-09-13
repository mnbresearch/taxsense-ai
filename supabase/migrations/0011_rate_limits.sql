-- Batch 97 — shared, cross-instance rate limiting (serverless-safe).
-- Service-role only: RLS enabled, no policies → anon/authenticated denied.
create table if not exists public.rate_limits (
  key          text primary key,
  count        int  not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

-- Atomic increment-within-window. Returns true if the hit is allowed.
create or replace function public.rl_hit(p_key text, p_limit int, p_window_secs int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur     public.rate_limits%rowtype;
  allowed boolean;
begin
  insert into public.rate_limits(key, count, window_start)
    values (p_key, 0, now())
    on conflict (key) do nothing;

  select * into cur from public.rate_limits where key = p_key for update;

  if now() - cur.window_start > make_interval(secs => p_window_secs) then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    allowed := true;
  elsif cur.count < p_limit then
    update public.rate_limits set count = cur.count + 1 where key = p_key;
    allowed := true;
  else
    allowed := false;
  end if;

  return allowed;
end;
$$;

revoke all on function public.rl_hit(text, int, int) from public, anon, authenticated;
