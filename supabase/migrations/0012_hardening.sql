-- 0012 — security hardening (review findings H1, H2, H4, M6, LOW).
-- Safe to run more than once.

-- H1: paid-online plans expire. NULL = admin-granted (no expiry).
alter table public.access_requests add column if not exists paid_until timestamptz;

-- H2: the app now matches emails exactly; store them normalised.
-- (unique index on lower(email) guarantees this can't collide)
update public.access_requests set email = lower(trim(email)) where email <> lower(trim(email));
update public.tax_reminders  set email = lower(trim(email)) where email <> lower(trim(email));

-- Transcript rows may only be attached to a profile the writer owns.
drop policy if exists "own messages" on public.intake_messages;
create policy "own messages" on public.intake_messages
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.tax_profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- H4: complete erasure after the 30-day grace period — every table that holds
-- the person's data, then the login itself. Payment ledger rows are retained
-- (GST/accounting law) but are not linked to any remaining account.
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
    if r.email is not null then
      delete from public.tax_reminders   where lower(email) = r.email;
      delete from public.email_log       where lower(to_email) = r.email;
      delete from public.access_requests where lower(email) = r.email;
      insert into public.email_suppressions(email, reason) values (r.email, 'account_deleted')
        on conflict (email) do update set reason = 'account_deleted';
    end if;
    insert into public.audit_events(event, meta) values ('account_purged', jsonb_build_object('at', now()));
    -- cascades deletion_requests and anything else keyed to the auth user
    delete from auth.users where id = r.user_id;
  end loop;
end $$;

-- M6: SECURITY DEFINER functions — pinned search_path, service-role only.
create or replace function public.purge_stale_intake_messages()
returns void language sql security definer set search_path = public as $$
  delete from public.intake_messages where created_at < now() - interval '18 months';
$$;

alter function public.admin_stats() set search_path = public, auth;
alter function public.touch_updated_at() set search_path = public;

revoke execute on function public.execute_pending_deletions()   from public, anon, authenticated;
revoke execute on function public.purge_stale_intake_messages() from public, anon, authenticated;
revoke execute on function public.admin_stats()                 from public, anon, authenticated;

-- Housekeeping for the shared rate limiter.
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
