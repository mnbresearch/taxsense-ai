-- Batch 15: pricing / filing-request flow — capture phone + requested plan.
alter table public.access_requests add column if not exists phone text;
alter table public.access_requests add column if not exists plan text;
