-- Canonical main pathway shared by all users (read via /api/pathway).
create table if not exists public.shared_pathway (
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_pathway enable row level security;

create policy "shared_pathway_public_read"
  on public.shared_pathway
  for select
  using (true);
