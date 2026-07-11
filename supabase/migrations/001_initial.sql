-- Supabase migration: user data + audio metadata

create table if not exists public.user_datasets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.audio_metadata (
  text_hash text primary key,
  sentence_id text not null,
  r2_key text not null,
  created_at timestamptz not null default now()
);

alter table public.user_datasets enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_stats enable row level security;
alter table public.audio_metadata enable row level security;

create policy "Users read own dataset"
  on public.user_datasets for select
  using (auth.uid() = user_id);

create policy "Users insert own dataset"
  on public.user_datasets for insert
  with check (auth.uid() = user_id);

create policy "Users update own dataset"
  on public.user_datasets for update
  using (auth.uid() = user_id);

create policy "Users read own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

create policy "Users read own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Users insert own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

create policy "Users update own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

create policy "Authenticated users read audio metadata"
  on public.audio_metadata for select
  to authenticated
  using (true);
