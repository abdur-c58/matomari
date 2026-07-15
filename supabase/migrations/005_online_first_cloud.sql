-- Online-first cloud schema: premade catalog, collision-safe sentences,
-- revisioned user snapshots, TTS job queue, and expanded audio manifests.

-- ── Shared premade catalog (referenced by app; was missing from migrations) ──
create table if not exists public.shared_premade_catalog (
  id text primary key default 'main',
  data jsonb not null,
  release_version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.shared_premade_catalog enable row level security;

drop policy if exists "shared_premade_catalog_public_read" on public.shared_premade_catalog;
create policy "shared_premade_catalog_public_read"
  on public.shared_premade_catalog
  for select
  using (true);

-- Ensure shared_pathway exists (from 002) before adding release_version.
-- Safe to re-run on DBs that never applied 002_shared_pathway.sql.
create table if not exists public.shared_pathway (
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_pathway enable row level security;

drop policy if exists "shared_pathway_public_read" on public.shared_pathway;
create policy "shared_pathway_public_read"
  on public.shared_pathway
  for select
  using (true);

alter table public.shared_pathway
  add column if not exists release_version bigint not null default 1;

-- ── Canonical catalog sentences (premade / pathway) ───────────────────────────
create table if not exists public.canonical_sentences (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  english text not null,
  content_fingerprint text not null,
  source text not null default 'catalog'
    check (source in ('catalog', 'pathway', 'premade')),
  speaker text check (speaker is null or speaker in ('A', 'B')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canonical_sentences_fingerprint_idx
  on public.canonical_sentences (content_fingerprint);

create table if not exists public.canonical_sentence_translations (
  sentence_id uuid not null references public.canonical_sentences(id) on delete cascade,
  dialect text not null check (dialect in ('standard', 'kansai')),
  fields jsonb not null,
  revision bigint not null default 1,
  provenance text not null default 'ai'
    check (provenance in ('ai', 'import', 'manual', 'backfill')),
  updated_at timestamptz not null default now(),
  primary key (sentence_id, dialect)
);

create index if not exists canonical_sentence_translations_updated_at_idx
  on public.canonical_sentence_translations (updated_at);

-- ── Private user custom sentences ────────────────────────────────────────────
create table if not exists public.user_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text not null,
  english text not null,
  content_fingerprint text not null,
  speaker text check (speaker is null or speaker in ('A', 'B')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, legacy_id)
);

create index if not exists user_sentences_user_id_idx
  on public.user_sentences (user_id);

create table if not exists public.user_sentence_translations (
  sentence_id uuid not null references public.user_sentences(id) on delete cascade,
  dialect text not null check (dialect in ('standard', 'kansai')),
  fields jsonb not null,
  revision bigint not null default 1,
  provenance text not null default 'ai'
    check (provenance in ('ai', 'import', 'manual', 'backfill')),
  updated_at timestamptz not null default now(),
  primary key (sentence_id, dialect)
);

alter table public.canonical_sentences enable row level security;
alter table public.canonical_sentence_translations enable row level security;
alter table public.user_sentences enable row level security;
alter table public.user_sentence_translations enable row level security;

drop policy if exists "canonical_sentences_public_read" on public.canonical_sentences;
create policy "canonical_sentences_public_read"
  on public.canonical_sentences for select using (true);

drop policy if exists "canonical_sentence_translations_public_read"
  on public.canonical_sentence_translations;
create policy "canonical_sentence_translations_public_read"
  on public.canonical_sentence_translations for select using (true);

drop policy if exists "user_sentences_owner_all" on public.user_sentences;
create policy "user_sentences_owner_all"
  on public.user_sentences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_sentence_translations_owner_select"
  on public.user_sentence_translations;
create policy "user_sentence_translations_owner_select"
  on public.user_sentence_translations for select
  using (
    exists (
      select 1 from public.user_sentences s
      where s.id = sentence_id and s.user_id = auth.uid()
    )
  );

-- ── Revisioned user snapshots (compare-and-swap) ─────────────────────────────
alter table public.user_datasets
  add column if not exists revision bigint not null default 1;
alter table public.user_progress
  add column if not exists revision bigint not null default 1;
alter table public.user_stats
  add column if not exists revision bigint not null default 1;

-- ── Expanded audio manifest ──────────────────────────────────────────────────
alter table public.audio_metadata
  add column if not exists dialect text not null default 'standard';
alter table public.audio_metadata
  add column if not exists speaker text not null default 'A';
alter table public.audio_metadata
  add column if not exists script_hash text;
alter table public.audio_metadata
  add column if not exists byte_size bigint;
alter table public.audio_metadata
  add column if not exists checksum text;
alter table public.audio_metadata
  add column if not exists generation_status text not null default 'ready';
alter table public.audio_metadata
  add column if not exists scope text not null default 'canonical';
alter table public.audio_metadata
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.audio_metadata
  add column if not exists canonical_sentence_id uuid references public.canonical_sentences(id) on delete set null;
alter table public.audio_metadata
  add column if not exists user_sentence_id uuid references public.user_sentences(id) on delete set null;
alter table public.audio_metadata
  add column if not exists updated_at timestamptz not null default now();

create index if not exists audio_metadata_sentence_id_idx
  on public.audio_metadata (sentence_id);
create index if not exists audio_metadata_script_hash_idx
  on public.audio_metadata (script_hash);

-- ── TTS generation job queue ─────────────────────────────────────────────────
create table if not exists public.tts_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  legacy_sentence_id text not null,
  dialect text not null default 'standard'
    check (dialect in ('standard', 'kansai')),
  speaker text not null default 'A'
    check (speaker in ('A', 'B')),
  scope text not null default 'canonical'
    check (scope in ('canonical', 'user')),
  owner_user_id uuid references auth.users(id) on delete cascade,
  canonical_sentence_id uuid references public.canonical_sentences(id) on delete cascade,
  user_sentence_id uuid references public.user_sentences(id) on delete cascade,
  spoken_script text,
  status text not null default 'pending'
    check (status in ('pending', 'leased', 'completed', 'failed', 'dead')),
  attempts int not null default 0,
  max_attempts int not null default 8,
  lease_owner text,
  lease_expires_at timestamptz,
  available_at timestamptz not null default now(),
  last_error text,
  result_text_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tts_generation_jobs_claim_idx
  on public.tts_generation_jobs (status, available_at)
  where status in ('pending', 'leased', 'failed');

alter table public.tts_generation_jobs enable row level security;
-- Jobs are service-role only (no anon/authenticated policies).
