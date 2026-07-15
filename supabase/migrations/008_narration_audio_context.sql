-- Narration audio can be content-addressed by final spoken script so identical
-- contextual delivery is reused across sentence and island IDs.

alter table public.tts_generation_jobs
  add column if not exists cache_mode text not null default 'sentence';

alter table public.tts_generation_jobs
  drop constraint if exists tts_generation_jobs_cache_mode_check;
alter table public.tts_generation_jobs
  add constraint tts_generation_jobs_cache_mode_check
  check (cache_mode in ('sentence', 'spoken-script'));

-- One content-addressed audio asset may serve multiple narration sentences.
create table if not exists public.audio_sentence_bindings (
  text_hash text not null references public.audio_metadata(text_hash) on delete cascade,
  sentence_id text not null,
  dialect text not null default 'standard'
    check (dialect in ('standard', 'kansai')),
  speaker text not null default 'A'
    check (speaker in ('A', 'B')),
  created_at timestamptz not null default now(),
  primary key (text_hash, sentence_id, dialect, speaker)
);

create index if not exists audio_sentence_bindings_sentence_idx
  on public.audio_sentence_bindings (sentence_id, dialect, speaker);

alter table public.audio_sentence_bindings enable row level security;

drop policy if exists "authenticated_read_audio_sentence_bindings"
  on public.audio_sentence_bindings;
create policy "authenticated_read_audio_sentence_bindings"
  on public.audio_sentence_bindings for select
  to authenticated
  using (true);
