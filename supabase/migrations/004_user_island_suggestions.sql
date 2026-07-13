-- Cached AI island theme suggestions per user (refreshed only on explicit user action)

create table if not exists public.user_island_suggestions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suggestions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_island_suggestions enable row level security;

create policy "Users read own island suggestions"
  on public.user_island_suggestions for select
  using (auth.uid() = user_id);

create policy "Users insert own island suggestions"
  on public.user_island_suggestions for insert
  with check (auth.uid() = user_id);

create policy "Users update own island suggestions"
  on public.user_island_suggestions for update
  using (auth.uid() = user_id);
