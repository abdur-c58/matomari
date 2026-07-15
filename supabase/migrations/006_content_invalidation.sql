-- Content invalidation: stale translation tracking and sentence versioning.

alter table public.canonical_sentences
  add column if not exists content_version bigint not null default 1;

alter table public.canonical_sentence_translations
  add column if not exists source_fingerprint text;
alter table public.canonical_sentence_translations
  add column if not exists status text not null default 'ready';
alter table public.canonical_sentence_translations
  add column if not exists stale_at timestamptz;
alter table public.canonical_sentence_translations
  add column if not exists stale_reason text;

alter table public.canonical_sentence_translations
  drop constraint if exists canonical_sentence_translations_status_check;
alter table public.canonical_sentence_translations
  add constraint canonical_sentence_translations_status_check
  check (status in ('ready', 'stale', 'translating', 'failed'));

create index if not exists canonical_sentence_translations_status_idx
  on public.canonical_sentence_translations (status)
  where status in ('stale', 'translating', 'failed');
