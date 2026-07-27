-- Async island export jobs (Pro PDF + audio zip).

create table if not exists public.island_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  island_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  dialect text not null default 'standard',
  result_r2_key text,
  result_byte_size bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists island_export_jobs_user_created_idx
  on public.island_export_jobs (user_id, created_at desc);

create index if not exists island_export_jobs_status_idx
  on public.island_export_jobs (status, created_at);

alter table public.island_export_jobs enable row level security;
-- Service-role API only (no authenticated policies).
