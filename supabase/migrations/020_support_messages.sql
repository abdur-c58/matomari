-- In-app support messages (public submit via API; staff read via admin).

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  sender_name text,
  sender_email text not null,
  category text not null default 'general'
    check (category in ('general', 'billing', 'bug', 'account', 'other')),
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists support_messages_status_created_idx
  on public.support_messages (status, created_at desc);

create index if not exists support_messages_user_id_idx
  on public.support_messages (user_id);

alter table public.support_messages enable row level security;
-- No policies: mutations and reads are server-only (service role).
