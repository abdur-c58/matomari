-- Rename Islands → Scenes (tables, columns, functions, policies, JSON keys).
-- Historical migrations 004/007/011/013/014 keep their filenames; this forward
-- migration renames live objects and rewrites stored JSON.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

alter table if exists public.user_island_suggestions
  rename to user_scene_suggestions;

alter table if exists public.island_shares
  rename to scene_shares;

alter table if exists public.shared_island_memberships
  rename to shared_scene_memberships;

alter table if exists public.island_export_jobs
  rename to scene_export_jobs;

-- ---------------------------------------------------------------------------
-- 2) Columns
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scene_shares'
      and column_name = 'source_island_id'
  ) then
    alter table public.scene_shares rename column source_island_id to source_scene_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scene_export_jobs'
      and column_name = 'island_key'
  ) then
    alter table public.scene_export_jobs rename column island_key to scene_key;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_subscriptions'
      and column_name = 'free_unlocked_island_keys'
  ) then
    alter table public.user_subscriptions
      rename column free_unlocked_island_keys to free_unlocked_scene_keys;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_subscriptions'
      and column_name = 'unlocked_island_keys'
  ) then
    alter table public.user_subscriptions
      rename column unlocked_island_keys to unlocked_scene_keys;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Indexes
-- ---------------------------------------------------------------------------

alter index if exists public.island_shares_owner_idx
  rename to scene_shares_owner_idx;
alter index if exists public.island_shares_source_island_idx
  rename to scene_shares_source_scene_idx;
alter index if exists public.shared_island_memberships_user_idx
  rename to shared_scene_memberships_user_idx;
alter index if exists public.island_export_jobs_user_created_idx
  rename to scene_export_jobs_user_created_idx;
alter index if exists public.island_export_jobs_status_idx
  rename to scene_export_jobs_status_idx;

-- ---------------------------------------------------------------------------
-- 4) RLS policies (drop old names, recreate on renamed tables)
-- ---------------------------------------------------------------------------

drop policy if exists "Users read own island suggestions" on public.user_scene_suggestions;
drop policy if exists "Users insert own island suggestions" on public.user_scene_suggestions;
drop policy if exists "Users update own island suggestions" on public.user_scene_suggestions;
drop policy if exists "Users read own scene suggestions" on public.user_scene_suggestions;
drop policy if exists "Users insert own scene suggestions" on public.user_scene_suggestions;
drop policy if exists "Users update own scene suggestions" on public.user_scene_suggestions;

create policy "Users read own scene suggestions"
  on public.user_scene_suggestions for select
  using (auth.uid() = user_id);
create policy "Users insert own scene suggestions"
  on public.user_scene_suggestions for insert
  with check (auth.uid() = user_id);
create policy "Users update own scene suggestions"
  on public.user_scene_suggestions for update
  using (auth.uid() = user_id);

drop policy if exists "island_shares_owner_select" on public.scene_shares;
drop policy if exists "island_shares_owner_write" on public.scene_shares;
drop policy if exists "island_shares_member_select" on public.scene_shares;
drop policy if exists "scene_shares_owner_select" on public.scene_shares;
drop policy if exists "scene_shares_owner_write" on public.scene_shares;
drop policy if exists "scene_shares_member_select" on public.scene_shares;

create policy "scene_shares_owner_select"
  on public.scene_shares for select
  using (auth.uid() = owner_user_id);
create policy "scene_shares_owner_write"
  on public.scene_shares for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
create policy "scene_shares_member_select"
  on public.scene_shares for select
  using (
    exists (
      select 1 from public.shared_scene_memberships m
      where m.share_id = id and m.user_id = auth.uid()
    )
  );

drop policy if exists "shared_memberships_self_select" on public.shared_scene_memberships;
drop policy if exists "shared_memberships_self_insert" on public.shared_scene_memberships;
drop policy if exists "shared_memberships_self_delete" on public.shared_scene_memberships;
drop policy if exists "shared_memberships_owner_select" on public.shared_scene_memberships;

create policy "shared_memberships_self_select"
  on public.shared_scene_memberships for select
  using (auth.uid() = user_id);
create policy "shared_memberships_self_insert"
  on public.shared_scene_memberships for insert
  with check (auth.uid() = user_id);
create policy "shared_memberships_self_delete"
  on public.shared_scene_memberships for delete
  using (auth.uid() = user_id);
create policy "shared_memberships_owner_select"
  on public.shared_scene_memberships for select
  using (
    exists (
      select 1 from public.scene_shares s
      where s.id = share_id and s.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Entitlement helpers + trigger (read data->'scenes')
-- ---------------------------------------------------------------------------

drop function if exists public.entitlement_max_islands(public.subscription_tier);

create or replace function public.entitlement_max_scenes(p_tier public.subscription_tier)
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

create or replace function public.user_datasets_enforce_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  effective public.subscription_tier;
  max_scenes integer;
  max_sentences integer;
  new_count integer;
  old_count integer;
  scene_key text;
  new_sentences integer;
  old_sentences integer;
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  effective := public.get_effective_subscription_tier(new.user_id);
  max_scenes := public.entitlement_max_scenes(effective);
  max_sentences := public.entitlement_max_sentences(effective);

  new_count := (
    select count(*)::integer
    from jsonb_each(coalesce(new.data->'scenes', '{}'::jsonb))
  );
  old_count := case
    when tg_op = 'UPDATE' then (
      select count(*)::integer
      from jsonb_each(coalesce(old.data->'scenes', '{}'::jsonb))
    )
    else 0
  end;

  if new_count > max_scenes and new_count > old_count then
    raise exception 'Scene limit exceeded (% of % allowed for % tier)',
      new_count, max_scenes, effective
      using errcode = 'P0001';
  end if;

  for scene_key in
    select jsonb_object_keys(coalesce(new.data->'scenes', '{}'::jsonb))
  loop
    new_sentences := coalesce(
      jsonb_array_length(new.data->'scenes'->scene_key->'sentences'),
      0
    );
    old_sentences := case
      when tg_op = 'UPDATE' then coalesce(
        jsonb_array_length(old.data->'scenes'->scene_key->'sentences'),
        0
      )
      else 0
    end;

    if new_sentences > max_sentences and new_sentences > old_sentences then
      raise exception 'Sentence limit exceeded on scene "%" (% of % allowed for % tier)',
        scene_key, new_sentences, max_sentences, effective
        using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) JSON data migrations
-- ---------------------------------------------------------------------------

-- user_datasets: islands → scenes; nested provenance.sourceIslandId → sourceSceneId
update public.user_datasets
set data = (
  case
    when data ? 'islands' and not (data ? 'scenes') then
      (data - 'islands') || jsonb_build_object('scenes', data->'islands')
    when data ? 'islands' and data ? 'scenes' then
      (data - 'islands')
    else data
  end
)
where data ? 'islands';

update public.user_datasets
set data = jsonb_set(
  data,
  '{scenes}',
  (
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    from (
      select
        e.key,
        case
          when e.value ? 'provenance'
               and (e.value->'provenance') ? 'sourceIslandId' then
            jsonb_set(
              e.value,
              '{provenance}',
              ((e.value->'provenance') - 'sourceIslandId')
                || jsonb_build_object(
                  'sourceSceneId',
                  e.value->'provenance'->'sourceIslandId'
                )
            )
          else e.value
        end as value
      from jsonb_each(coalesce(data->'scenes', '{}'::jsonb)) as e(key, value)
    ) rewritten
  )
)
where data ? 'scenes';

-- user_progress: rename known island-shaped keys when present
update public.user_progress
set data = (
  select
    (
      coalesce(data, '{}'::jsonb)
      - 'completedIslands'
      - 'islandBatchSnapshots'
      - 'islandFolders'
      - 'islandFolderAssignments'
    )
    || case when data ? 'completedIslands'
        then jsonb_build_object('completedScenes', data->'completedIslands')
        else '{}'::jsonb end
    || case when data ? 'islandBatchSnapshots'
        then jsonb_build_object('sceneBatchSnapshots', data->'islandBatchSnapshots')
        else '{}'::jsonb end
    || case when data ? 'islandFolders'
        then jsonb_build_object('sceneFolders', data->'islandFolders')
        else '{}'::jsonb end
    || case when data ? 'islandFolderAssignments'
        then jsonb_build_object('sceneFolderAssignments', data->'islandFolderAssignments')
        else '{}'::jsonb end
)
where data ? 'completedIslands'
   or data ? 'islandBatchSnapshots'
   or data ? 'islandFolders'
   or data ? 'islandFolderAssignments';

-- settings.islandBrowseDisplay → sceneBrowseDisplay
update public.user_progress
set data = jsonb_set(
  data,
  '{settings}',
  (coalesce(data->'settings', '{}'::jsonb) - 'islandBrowseDisplay')
    || jsonb_build_object(
      'sceneBrowseDisplay',
      data->'settings'->'islandBrowseDisplay'
    )
)
where (data->'settings') ? 'islandBrowseDisplay';

-- notifications.islandReminders → sceneReminders
update public.user_progress
set data = jsonb_set(
  data,
  '{notifications}',
  (coalesce(data->'notifications', '{}'::jsonb) - 'islandReminders')
    || jsonb_build_object(
      'sceneReminders',
      data->'notifications'->'islandReminders'
    )
)
where (data->'notifications') ? 'islandReminders';

-- studyUnitLastOpened keys island: → scene:
update public.user_progress
set data = jsonb_set(
  data,
  '{studyUnitLastOpened}',
  (
    select coalesce(jsonb_object_agg(
      case
        when key like 'island:%' then 'scene:' || substr(key, 8)
        else key
      end,
      value
    ), '{}'::jsonb)
    from jsonb_each(coalesce(data->'studyUnitLastOpened', '{}'::jsonb))
  )
)
where data ? 'studyUnitLastOpened'
  and exists (
    select 1 from jsonb_object_keys(data->'studyUnitLastOpened') k
    where k like 'island:%'
  );

-- AI generation event kind
update public.ai_generation_events
set kind = 'scene'
where kind = 'island';

alter table public.ai_generation_events
  alter column kind set default 'scene';
