-- App staff roles on profiles + admin audit log.
-- First admin must be granted via manual SQL in the Supabase dashboard (no bootstrap path).

create type public.app_role as enum ('user', 'admin', 'support');

alter table public.profiles
  add column if not exists role public.app_role not null default 'user';

create index if not exists profiles_role_idx on public.profiles (role);

-- Staff helpers (security definer so RLS can reference them without recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role in ('admin', 'support')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- Block role self-escalation via client/JWT paths.
-- Allowed: service-role API, existing admins, and Supabase dashboard (postgres).
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'user'
       and auth.role() is distinct from 'service_role'
       and current_user not in ('postgres', 'supabase_admin')
       and not public.is_admin() then
      raise exception 'Only admins can assign a non-user role';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.role() is distinct from 'service_role'
       and current_user not in ('postgres', 'supabase_admin')
       and not public.is_admin() then
      raise exception 'Only admins can change profiles.role';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row
  execute function public.profiles_protect_role();

-- Replace owner-only policies: owners keep self access; staff can read all profiles.
drop policy if exists "profiles_owner_select" on public.profiles;
drop policy if exists "profiles_owner_upsert" on public.profiles;

create policy "profiles_owner_select"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_staff());

create policy "profiles_owner_insert"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_owner_update"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Audit log for staff actions
create type public.admin_action_type as enum (
  'role_change',
  'comp_access',
  'revoke_access',
  'refund_issued',
  'subscription_override'
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action_type public.admin_action_type not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_user_id);

create index if not exists admin_audit_log_action_type_idx
  on public.admin_audit_log (action_type);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;

-- Admins may read the audit log. Inserts go through the service-role API layer only.
drop policy if exists "admin_audit_log_admin_select" on public.admin_audit_log;
create policy "admin_audit_log_admin_select"
  on public.admin_audit_log for select
  using (public.is_admin());
