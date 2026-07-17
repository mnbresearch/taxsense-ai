-- Batch 30: per-user PDF history — every filing summary a signed-in user
-- generates is snapshotted so they can re-download it later.
create table if not exists public.pdf_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fy text not null default 'FY2025-26',
  -- Full TaxProfile JSON at generation time (re-generates the exact PDF).
  profile jsonb not null,
  estimates jsonb,
  regime text,
  total_tax numeric,
  created_at timestamptz not null default now()
);

create index if not exists pdf_history_user_created
  on public.pdf_history (user_id, created_at desc);

alter table public.pdf_history enable row level security;

create policy "own pdf history" on public.pdf_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
