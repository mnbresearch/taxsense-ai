-- Batch 27: manual payment loop — lead → active customer.
alter table public.access_requests add column if not exists status text not null default 'lead';
