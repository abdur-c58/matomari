-- Free unlocked custom island keys (grandfather extras stay stored but locked).

alter table public.user_subscriptions
  add column if not exists free_unlocked_island_keys text[] not null default '{}';

-- Only block Free island-count when the library GROWS beyond the cap
-- (allows grandfathered >3 islands after Plus downgrade).
-- Sentence caps: only block when a NEW island exceeds max, or an existing
-- island's sentence count increases beyond max (grandfather oversized).

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

  -- Reject only when adding islands past the Free/Plus cap.
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

    -- Allow grandfathered oversized islands; block growth past the cap.
    if new_sentences > max_sentences and new_sentences > old_sentences then
      raise exception 'Sentence limit exceeded on island "%" (% of % allowed for % tier)',
        island_key, new_sentences, max_sentences, effective
        using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;
