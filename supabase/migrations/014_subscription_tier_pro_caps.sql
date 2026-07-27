-- Pro entitlement caps + effective-tier semantics.
-- Runs after 012 so enum label 'pro' is already committed.

-- Effective tier: Plus or Pro while active/past_due, or canceled-but-not-yet-expired.
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

  if row.tier in ('plus', 'pro') then
    if row.status = 'active' or row.status = 'past_due' then
      return row.tier;
    end if;
    if row.status = 'canceled'
       and row.cancel_at_period_end
       and row.current_period_end is not null
       and row.current_period_end > now() then
      return row.tier;
    end if;
  end if;

  return 'free';
end;
$$;

-- Caps mirror lib/constants/entitlements.ts (keep in sync).
create or replace function public.entitlement_max_islands(p_tier public.subscription_tier)
returns integer
language sql
immutable
as $$
  select case
    when p_tier = 'pro' then 50
    when p_tier = 'plus' then 15
    else 3
  end;
$$;

create or replace function public.entitlement_max_sentences(p_tier public.subscription_tier)
returns integer
language sql
immutable
as $$
  select case
    when p_tier = 'pro' then 150
    when p_tier = 'plus' then 50
    else 20
  end;
$$;

-- Alias column for generalized unlock keys (Free/Plus downgrade grandfathering).
-- Keep free_unlocked_island_keys populated for backwards compatibility.
alter table public.user_subscriptions
  add column if not exists unlocked_island_keys text[] not null default '{}';

update public.user_subscriptions
set unlocked_island_keys = free_unlocked_island_keys
where coalesce(array_length(unlocked_island_keys, 1), 0) = 0
  and coalesce(array_length(free_unlocked_island_keys, 1), 0) > 0;

-- Growth-only entitlement trigger (grandfather extras after downgrade).
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
  new_count integer;
  old_count integer;
  island_key text;
  new_sentences integer;
  old_sentences integer;
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  effective := public.get_effective_subscription_tier(new.user_id);
  max_islands := public.entitlement_max_islands(effective);
  max_sentences := public.entitlement_max_sentences(effective);

  new_count := (
    select count(*)::integer
    from jsonb_each(coalesce(new.data->'islands', '{}'::jsonb))
  );
  old_count := case
    when tg_op = 'UPDATE' then (
      select count(*)::integer
      from jsonb_each(coalesce(old.data->'islands', '{}'::jsonb))
    )
    else 0
  end;

  if new_count > max_islands and new_count > old_count then
    raise exception 'Island limit exceeded (% of % allowed for % tier)',
      new_count, max_islands, effective
      using errcode = 'P0001';
  end if;

  for island_key in
    select jsonb_object_keys(coalesce(new.data->'islands', '{}'::jsonb))
  loop
    new_sentences := coalesce(
      jsonb_array_length(new.data->'islands'->island_key->'sentences'),
      0
    );
    old_sentences := case
      when tg_op = 'UPDATE' then coalesce(
        jsonb_array_length(old.data->'islands'->island_key->'sentences'),
        0
      )
      else 0
    end;

    if new_sentences > max_sentences and new_sentences > old_sentences then
      raise exception 'Sentence limit exceeded on island "%" (% of % allowed for % tier)',
        island_key, new_sentences, max_sentences, effective
        using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;
