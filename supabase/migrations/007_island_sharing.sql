-- Island sharing: profiles, share tokens (hashed), and memberships.
-- Live island content remains in owner user_datasets.data jsonb.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_owner_upsert" on public.profiles;
create policy "profiles_owner_upsert"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Share access index (content stays in the owner's dataset snapshot).
create table if not exists public.island_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_island_id text not null,
  share_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, source_island_id)
);

create index if not exists island_shares_owner_idx
  on public.island_shares (owner_user_id);

create index if not exists island_shares_source_island_idx
  on public.island_shares (owner_user_id, source_island_id);

alter table public.island_shares enable row level security;

drop policy if exists "island_shares_owner_select" on public.island_shares;
create policy "island_shares_owner_select"
  on public.island_shares for select
  using (auth.uid() = owner_user_id);

drop policy if exists "island_shares_owner_write" on public.island_shares;
create policy "island_shares_owner_write"
  on public.island_shares for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create table if not exists public.shared_island_memberships (
  share_id uuid not null references public.island_shares(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (share_id, user_id)
);

create index if not exists shared_island_memberships_user_idx
  on public.shared_island_memberships (user_id);

alter table public.shared_island_memberships enable row level security;

drop policy if exists "shared_memberships_self_select" on public.shared_island_memberships;
create policy "shared_memberships_self_select"
  on public.shared_island_memberships for select
  using (auth.uid() = user_id);

drop policy if exists "shared_memberships_self_insert" on public.shared_island_memberships;
create policy "shared_memberships_self_insert"
  on public.shared_island_memberships for insert
  with check (auth.uid() = user_id);

drop policy if exists "shared_memberships_self_delete" on public.shared_island_memberships;
create policy "shared_memberships_self_delete"
  on public.shared_island_memberships for delete
  using (auth.uid() = user_id);

drop policy if exists "shared_memberships_owner_select" on public.shared_island_memberships;
create policy "shared_memberships_owner_select"
  on public.shared_island_memberships for select
  using (
    exists (
      select 1 from public.island_shares s
      where s.id = share_id and s.owner_user_id = auth.uid()
    )
  );

-- Members can resolve share metadata for islands already in their library.
drop policy if exists "island_shares_member_select" on public.island_shares;
create policy "island_shares_member_select"
  on public.island_shares for select
  using (
    exists (
      select 1 from public.shared_island_memberships m
      where m.share_id = id and m.user_id = auth.uid()
    )
  );
