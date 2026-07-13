-- Canonical sentence translations shared by all users (keyed by sentence id).
create table if not exists public.shared_sentence_translations (
  sentence_id text primary key,
  translations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists shared_sentence_translations_updated_at_idx
  on public.shared_sentence_translations (updated_at);

alter table public.shared_sentence_translations enable row level security;

create policy "shared_sentence_translations_public_read"
  on public.shared_sentence_translations
  for select
  using (true);
