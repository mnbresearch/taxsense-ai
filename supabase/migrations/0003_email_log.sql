-- Batch 12: email CRM — log of every transactional + campaign email sent.
create table public.email_log (
  id bigint generated always as identity primary key,
  to_email text not null,
  subject text not null,
  kind text not null default 'custom',   -- admin_notify | confirmation | welcome | custom
  status text not null default 'sent',   -- sent | failed | skipped
  error text,
  created_at timestamptz not null default now()
);

create index email_log_created_idx on public.email_log (created_at desc);

-- Deny-by-default: only the service role (admin APIs) touches this table.
alter table public.email_log enable row level security;
