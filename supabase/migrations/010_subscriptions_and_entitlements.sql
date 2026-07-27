-- Subscriptions, AI generation rate-limit events, and library entitlement enforcement.

create type public.subscription_tier as enum ('free', 'plus');
create type public.subscription_status as enum ('active', 'canceled', 'past_due');

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_tier_idx
  on public.user_subscriptions (tier);

alter table public.user_subscriptions enable row level security;

drop policy if exists "user_subscriptions_owner_select" on public.user_subscriptions;
create policy "user_subscriptions_owner_select"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Backfill free subscriptions for existing auth users.
insert into public.user_subscriptions (user_id, tier, status)
select id, 'free', 'active'
from auth.users
on conflict (user_id) do nothing;

-- AI generation events (daily backstop; survives island deletion).
create table if not exists public.ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'island',
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_events_user_kind_created_idx
  on public.ai_generation_events (user_id, kind, created_at desc);

alter table public.ai_generation_events enable row level security;
-- No authenticated policies: service-role API only.

-- Effective tier: Plus while active/past_due, or canceled-but-not-yet-expired.
create or replace function public.get_effective_subscription_tier(p_user_id uuid)
returns public.subscription_tier
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.user_subscriptions%rowtype;
begin
  select * into row
  from public.user_subscriptions
  where user_id = p_user_id;

  if not found then
    return 'free';
  end if;

  if row.tier = 'plus' then
    if row.status = 'active' or row.status = 'past_due' then
      return 'plus';
    end if;
    if row.status = 'canceled'
       and row.cancel_at_period_end
       and row.current_period_end is not null
       and row.current_period_end > now() then
      return 'plus';
    end if;
  end if;

  return 'free';
end;
$$;

revoke all on function public.get_effective_subscription_tier(uuid) from public;
grant execute on function public.get_effective_subscription_tier(uuid) to authenticated;
grant execute on function public.get_effective_subscription_tier(uuid) to service_role;

-- Caps mirror lib/constants/entitlements.ts (keep in sync).
create or replace function public.entitlement_max_islands(p_tier public.subscription_tier)
returns integer
language sql
immutable
as $$
  select case when p_tier = 'plus' then 15 else 3 end;
$$;

create or replace function public.entitlement_max_sentences(p_tier public.subscription_tier)
returns integer
language sql
immutable
as $$
  select case when p_tier = 'plus' then 50 else 20 end;
$$;

create or replace function public.user_datasets_enforce_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  effective public.subscription_tier;
  max_islands integer;
  max_sentences integer;
  island_count integer;
  island_key text;
  sentence_count integer;
begin
  -- Dashboard repair paths may bypass. App sync uses service_role and is enforced.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  effective := public.get_effective_subscription_tier(new.user_id);
  max_islands := public.entitlement_max_islands(effective);
  max_sentences := public.entitlement_max_sentences(effective);

  island_count := (
    select count(*)::integer
    from jsonb_each(coalesce(new.data->'islands', '{}'::jsonb))
  );
  if island_count > max_islands then
    raise exception 'Island limit exceeded (% of % allowed for % tier)',
      island_count, max_islands, effective
      using errcode = 'P0001';
  end if;

  for island_key in
    select jsonb_object_keys(coalesce(new.data->'islands', '{}'::jsonb))
  loop
    sentence_count := coalesce(
      jsonb_array_length(new.data->'islands'->island_key->'sentences'),
      0
    );
    if sentence_count > max_sentences then
      raise exception 'Sentence limit exceeded on island "%" (% of % allowed for % tier)',
        island_key, sentence_count, max_sentences, effective
        using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists user_datasets_enforce_entitlements on public.user_datasets;
create trigger user_datasets_enforce_entitlements
  before insert or update on public.user_datasets
  for each row
  execute function public.user_datasets_enforce_entitlements();
