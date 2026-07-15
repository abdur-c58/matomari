# Kotoshima (言島) — Full Product, Technical & Business Brief

> **Purpose of this document:** Comprehensive context dump for strategic planning, marketing, pricing, and product decisions. Generated from codebase analysis and business assessment by **Cursor AUTO** (AI coding agent in Cursor IDE).

---

## Part 1: Cursor AUTO's Assessment & Thoughts

### What Kotoshima Is

**Kotoshima** is a Japanese language learning web app (PWA) built around **Natural Language Learning (NLL)** and **Language Islands** methodology — concepts developed by Mikel Telleria at the University of Deusto. Kotoshima is an **independent implementation**, not officially affiliated with NLL.

The app teaches practical Japanese through:

- **Complete sentences** (not isolated vocabulary or grammar tables)
- **Language Islands** — topic/situation-based collections (café, travel, introductions, etc.)
- **Daily guided study batches** (~20–25 sentences at a time)
- **Active recall** (produce Japanese from English prompts)
- **Shadowing** (listen and repeat at native speed)
- **Spaced repetition** for long-term retention
- **AI-assisted** island creation, translation, tutoring, and transcript analysis

**Current scope:** Japanese only (Standard + Kansai dialect). Version `0.1.0`. README states "in development" but foundational services are complete.

---

### Is This an MVP?

| Lens | Verdict |
|------|---------|
| **Personal tool** | **Beyond MVP.** Real daily study OS with Today plan, pathway, islands, placement, shadowing, recall, SRS, library, dialects, AI tutor, TTS, sync, PWA, mobile + desktop. |
| **Ship-to-strangers MVP** | **Yes.** A serious learner could use it today if deployed with onboarding. |
| **Full commercial product** | **Not yet.** No billing/subscriptions, Japanese-only, no usage limits on AI/TTS, thin automated test suite, no proven external user retention. |

**Summary:** Product depth is high; business readiness is early. That's actually a good position for indie SaaS — most MVPs are thin; this is deep on method, light on go-to-market.

---

### Can It Become a Full-Fledged App? Is It Worth It?

**Yes, technically it can.** Architecture is product-minded: Auth.js + Google OAuth, Supabase sync, Cloudflare R2 audio, shared pathway/premade catalog, IndexedDB offline, 16 API routes, 25+ services, mobile/desktop split, PWA.

**Worth commercializing only as a niche business, not "beat Duolingo."**

**Reasons it could work:**

- Clear differentiation: structured sentence batches + shadow + recall + personalized islands (not gamified streaks)
- Japanese-specific depth: Fish Audio TTS with pitch/intonation, Kansai dialect support, `[name]` placeholder personalization
- Competes with Anki + sentence mining + immersion tooling — but with a guided daily loop
- Builder authenticity: "I built this because I needed it" is strong trust marketing for serious learners

**Reasons it might not be worth it:**

- No distribution yet (personal value ≠ market value)
- Variable costs: OpenAI (tutor, islands, translation) + Fish Audio (TTS) per user — margins need hard caps
- Method positioning borrows from NLL/Language Islands — need clear independent IP story for commercial sale
- Language learning is crowded; niche positioning is mandatory

**Personal ROI:** Already worth it if you use it daily.
**Business ROI:** Worth it if willing to spend months on packaging, pricing, retention, and acquisition — not just more features.

---

### Subscription Pricing Recommendation (Cursor AUTO)

**Market anchors (US, 2025):**

- Duolingo Super: ~$12.99/mo or ~$7/mo annual
- Duolingo Max (AI): ~$30/mo or ~$14/mo annual
- Babbel: ~$7–15/mo depending on term
- Busuu: ~$7–14/mo

**Recommended: 2 plans (+ free), not 5**

| Plan | Price (US) | Target user | Includes |
|------|------------|-------------|----------|
| **Free** | $0 | Curious / try the method | Pathway + limited daily study, local progress, limited premade islands. **Hard caps** on TTS, translate, tutor, island generation |
| **Plus** | **$9.99–12.99/mo** or **$79–99/yr** | Core paid learners | Full curriculum, sync, generous TTS (cached), offline/PWA, progress, dialects, soft AI limits |
| **Pro** (optional 3rd) | **$16–19.99/mo** or **$149–179/yr** | Power users | Higher AI limits (tutor, custom islands, transcript tools), priority TTS |

**Simplest launch:** Free + Plus only at **$11.99/mo or $89/yr**. Add Pro later only if AI-heavy users cost real money.

**Why not cheaper:** Value is denser study time, not 5-minute streaks.
**Why not $30/mo:** No brand yet. Sweet spot for indie Japanese specialist: **$10–13/mo with annual discount**.

**Critical:** Cap AI/TTS usage on free tier. Unlimited AI on a $10 plan will destroy margins.

---

### Valuation If Sold Today

Without meaningful revenue or users, valuation is **asset value**, not SaaS multiples.

| Scenario | Rough worth |
|----------|-------------|
| Code + design + Japanese content, pre-users, pre-revenue | **$8k–40k** |
| Live product, sticky niche users, little/no revenue | **$25k–100k** (depends on MAU, retention, content uniqueness) |
| With revenue | Often **2–4× ARR** early indie; e.g. $5k MRR ≈ $60k ARR → **$120k–250k** ballpark |

**Realistic ceiling today:** Mid five figures if polished and documented. Not six figures without traction proof.

**Potential buyers:** Japanese-learning indie founders, edtech builders wanting a vertical, someone wanting the pathway + island generation + audio pipeline. Big platforms rarely buy pre-revenue method clones.

---

### Marketing Guidance (Cursor AUTO — "I Don't Know How to Market")

**Don't market as "a language learning app."** Too broad.

**Market as:**

> "A Japanese study app for people who hate random flashcards and want to learn through real sentences, shadowing, recall, and daily guided batches."

**First audience:**

- Japanese learners N5–N3
- People overwhelmed by Anki
- Comprehensible input / immersion learners
- People wanting speaking/listening practice with structure
- Kansai dialect learners (if you lean into that niche)

**First marketing goal:** Not sales or virality. Get **10 real users for 14–30 days** and ask: what confused them, what they loved, would they pay.

**Where to find them:**

- Reddit: r/LearnJapanese, r/JapaneseLanguage, r/languagelearning
- Discord servers for Japanese learning
- YouTube comments on Japanese learning channels
- X/Twitter around Anki, immersion, Japanese study
- Indie Hackers / Build in Public (secondary)

**Don't post like an ad. Post like a builder asking for feedback.**

**Example post:**

```
I built a Japanese learning app for myself because I kept bouncing between Anki, shadowing, sentence mining, and random notes.

The app gives you daily sentence batches, meaning checks, native-style audio, shadowing, recall, SRS reviews, and custom "language islands" for situations like restaurants, travel, introductions, etc.

It's Japanese-only right now and still rough, but I'm looking for 10 learners to try it for free and tell me if the study loop actually helps.

Would anyone be open to testing it?
```

**Positioning one-liner:**

> Kotoshima helps Japanese learners build usable speaking/listening ability through daily sentence batches, shadowing, recall, and personalized language islands.

**Problem statement:**

> Most Japanese learners collect words. Kotoshima trains usable sentences.

**First 6 steps:**

1. Simple landing page with one clear promise
2. Screenshots or 60-second demo video
3. "Join beta" / email capture
4. Invite 10–20 learners manually
5. Watch where they get stuck
6. Ask: "Would you pay $10/month if this kept improving?"

**You do NOT need yet:** paid ads, SEO strategy, TikTok content machine, big launch, brand agency, complex funnel.

**Deciding metric:** Can non-you users keep a streak for 30+ days without hand-holding? If yes → commercialize. If only you love it → keep as personal edge.

---

## Part 2: Product Overview

### Branding

- **App name:** Kotoshima (言島)
- **Tagline:** "Personalized Japanese learning through language islands"
- **Method name:** "The Kotoshima Method"
- **Export filename:** `kotoshima-dataset.json`

### Learning Philosophy

Based on Natural Language Learning (NLL) and Language Islands:

1. Humans acquire language through meaningful exposure, active recall, and repeated interaction slightly beyond current ability
2. Learning happens when the brain is challenged — attempting, making mistakes, correcting
3. Language Islands organize learning into focused communication areas
4. Complete language chunks and real-world examples beat isolated words and separate grammar study
5. Islands connect over time, building wider communicative ability

### Daily Study Loop (The Core Product)

```
Today (home) → Confirm meanings → Listen & shadow → Active recall → Review retired (SRS)
         ↑                                                              |
         └──────────────────── daily plan resets ←──────────────────────┘
```

1. **Confirm meanings** — understand each sentence before listening (prevents passive listening)
2. **Shadow** — listen and repeat at native speed (pronunciation, rhythm, muscle memory)
3. **Active recall** — see English, produce Japanese from memory, rate 1–5 stars
4. **Review** — retired sentences (rating ≥ 4) return on SRS schedule [1, 3, 7, 14, 30, 60 days]

### Sentence Lifecycle

```
unseen → active (in batch) → retired (rating ≥ 4) → mastered (rating 5)
                                    ↓
                              SRS review queue
```

---

## Part 3: Full Feature List

### Core Study Features

- [x] **Today page** — daily prioritized checklist (meanings → shadow → recall → review)
- [x] **Main pathway** — shared curated batch curriculum (numbered batches, difficulty progression)
- [x] **Language islands** — user-created or AI-generated topic collections
- [x] **Premade islands** — shared catalog of ready-made islands (e.g. "300 Language Essentials")
- [x] **Batch system** — configurable active batch (10–75 sentences, default ~20–25)
- [x] **Confirm meanings** — pre-listening comprehension check
- [x] **Shadowing mode** — listen + repeat with native audio
- [x] **Active recall** — English prompt → produce Japanese → star rating
- [x] **SRS review** — spaced repetition for retired sentences
- [x] **Return review** — when switching study units, review previous batch
- [x] **Placement flow** — self-assess fluency/JLPT → probe sentences → skip earlier pathway batches (UI exists; `/placement` route currently redirects to `/batch`)
- [x] **Weak sentences** — filter/rate sentences rated 1–2 stars
- [x] **Star ratings** — 1–5 scale; ≥4 retires from active batch; 5 = mastered
- [x] **Study streaks** — consecutive days with completed study
- [x] **Daily progress tracking** — tasks completed, minutes studied, shadow sessions

### Content & Islands

- [x] **AI island generation** — theme + difficulty → full island with sentences
- [x] **Manual island creation** — hand-build islands sentence by sentence
- [x] **Island folders** — organize user islands into folders
- [x] **Island theme kanji** — decorative 1–2 character watermark per island (AI-generated)
- [x] **Narration format islands** — multi-speaker dialogue (A/B speakers)
- [x] **Premade catalog** — shared folders of curated islands
- [x] **Pathway batches** — structured curriculum with difficulty ranges
- [x] **Subtopic grouping** — sentences grouped within islands
- [x] **Sentence registers** — casual, polite, formal
- [x] **Difficulty ratings** — per-sentence difficulty scores
- [x] **Context notes** — situational notes per sentence
- [x] **Tags** — categorization metadata
- [x] **`[name]` placeholder** — personalized learner name in sentences (katakana via AI)

### Translation & Dialects

- [x] **Standard Japanese** — default dialect
- [x] **Kansai dialect** — Osaka/Kyoto-ben with phonetic reading for TTS accent
- [x] **AI translation** — English seed sentences → Japanese (standard or Kansai)
- [x] **Shared translation pool** — community-cached translations (reduces API calls)
- [x] **Per-user translation storage** — dialect-specific translations in user library
- [x] **Bulk translate** — translate all untranslated sentences in batch/island
- [x] **Dialect preferences** — show Kansai, set Kansai as primary display

### Audio & TTS

- [x] **Fish Audio TTS** — Japanese TTS with pitch accent and intonation
- [x] **Separate voices** — standard vs Kansai, speaker A vs B
- [x] **R2 audio cache** — Cloudflare R2 CDN for generated audio
- [x] **Local audio cache** — IndexedDB cache for offline playback
- [x] **Audio sync to cloud** — upload missing audio on manual sync
- [x] **Global audio player** — persistent player across pages
- [x] **Casual listen playlists** — play island/pathway sentences sequentially
- [x] **Playlist controls** — pause between sentences, playback speed
- [x] **Media Session API** — lock screen controls on mobile
- [x] **TTS prosody tuning** — temperature, speed, volume config

### AI Features

- [x] **AI Tutor chat** — contextual Q&A (general or sentence-specific), streaming responses
- [x] **Island generation** — full island from theme prompt
- [x] **Island suggestions** — AI suggests next island themes (cached per user)
- [x] **Island kanji picker** — decorative kanji for island UI
- [x] **Sentence intent clarification** — disambiguate ambiguous English before adding
- [x] **Sentence review** — grammar/tone check on English sentences
- [x] **Transcript segmentation** — paste Japanese transcript → study sentences
- [x] **Name translation** — transliterate learner name to katakana
- [x] **Pre-study / transcript analyzer** — analyze text before consuming media

### Library & Browse

- [x] **Full sentence library** — search all pathway + island sentences
- [x] **Filters** — by source, rating, translation status, dialect, register, difficulty
- [x] **Sort** — by difficulty, rating, date, alphabetical
- [x] **Group by** — island, subtopic, rating, translation status
- [x] **Bulk rating** — rate multiple sentences at once
- [x] **Buffered rendering** — performant large lists

### Progress & Stats

- [x] **Progress dashboard** — charts via Recharts
- [x] **Study streak** — consecutive active days
- [x] **Mastery tracking** — mastered sentence count over time
- [x] **Mode session tracking** — time in listen, shadow, recall, review, meaning_check, library, weak
- [x] **Daily snapshots** — weak/mastered counts, completed tasks per day
- [x] **Weak sentence trends** — track problem areas

### Account & Sync

- [x] **Google OAuth sign-in** — via Auth.js (NextAuth v5 beta)
- [x] **Supabase user provisioning** — auto-create user on first sign-in
- [x] **Cloud sync** — dataset (islands), progress, stats across devices
- [x] **Offline-first** — IndexedDB local storage, sync queue with debounced push
- [x] **Offline access** — use app without sign-in if local data exists
- [x] **Manual sync trigger** — push + pull + audio sync from settings
- [x] **Conflict resolution** — timestamp-based merge, preserve local UI prefs

### Import / Export

- [x] **Import JSON** — full dataset, islands-only, single island, or keyed island object
- [x] **Merge strategies** — combine imported data with existing library
- [x] **Export dataset** — download full composed dataset as JSON
- [x] **Sample dataset** — `public/sample-dataset.json` for testing

### UI / UX

- [x] **Mobile layout** — top bar + slide-out nav, bottom sheets, safe-area insets
- [x] **Desktop layout** — fixed sidebar + persistent AI tutor panel
- [x] **Responsive breakpoint** — 767px (`useIsMobileViewport`)
- [x] **Onboarding tour** — 12-step product tour (welcome → install)
- [x] **Method guide** — in-app explanation of Kotoshima method
- [x] **PWA install** — add to home screen hints (iOS/Android/desktop)
- [x] **UI font choice** — Bitter or Red Hat Display
- [x] **Japanese fonts** — Noto Serif JP, Yuji Boku
- [x] **Dark/light theme** — system-aware
- [x] **Keyboard shortcuts** — desktop shortcuts hint
- [x] **Framer Motion animations** — reduced motion support
- [x] **Toast notifications** — Sonner

### PWA & Offline

- [x] **Web app manifest** — standalone mode, icons 16–512px
- [x] **Service worker** — precache, network-first nav, cache-first static, offline fallback
- [x] **Apple splash screens** — full set of device sizes
- [x] **Offline page** — `public/offline.html`
- [x] **Push notification support** — daily study reminders, review reminders, per-island reminders (infrastructure exists)

### Settings & Preferences

- [x] Batch size slider (10–75)
- [x] Dialect toggles (show Kansai, Kansai as primary)
- [x] Notification preferences (daily study time, review reminders)
- [x] Learner display name + Japanese reading
- [x] Island browse display mode (EN / JP / both)
- [x] Casual playlist pause and playback rate
- [x] Onboarding replay
- [x] Placement retake link

### Admin / Content Publishing (Scripts)

- [x] Publish pathway to Supabase
- [x] Build premade catalog
- [x] Publish shared translations
- [x] Regenerate all TTS audio
- [x] Audit/retranslate flagged translations
- [x] Generate PWA icons and splash screens
- [x] Verify SRS logic
- [x] Verify TTS pipeline

### NOT Built Yet (Gaps)

- [ ] Subscription / billing (Stripe or similar)
- [ ] Usage limits / quotas on AI and TTS
- [ ] Multi-language support (Japanese only)
- [ ] Automated test suite (only manual verify scripts)
- [ ] Landing/marketing page
- [ ] Email capture / waitlist
- [ ] Analytics beyond Vercel Analytics
- [ ] Admin dashboard
- [ ] User management
- [ ] Content moderation
- [ ] Social features / community
- [ ] Placement route enabled (`/placement` redirects to `/batch`)
- [ ] `shared_premade_catalog` Supabase migration (code references it, no SQL file)

---

## Part 4: Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.10 (App Router) |
| UI | React 19.2.4, Tailwind CSS 4, Radix UI, Framer Motion |
| Auth | Auth.js (NextAuth v5 beta) + Google OAuth |
| Database (cloud) | Supabase (PostgreSQL + RLS) |
| Local storage | IndexedDB via `idb` library |
| AI | OpenAI API (default model: `gpt-5.4-mini`) |
| TTS | Fish Audio API |
| Audio CDN | Cloudflare R2 (S3-compatible) |
| Charts | Recharts |
| Validation | Zod 4 |
| Deployment | Vercel (Analytics + Speed Insights) |
| PWA | Custom service worker + manifest |

### Architecture Diagram

```
Google Auth → Auth.js → Supabase user_id
                    ↓
IndexedDB (local) ←→ sync queue ←→ /api/sync ←→ Supabase user_*
                    ↓
Composed Dataset = shared pathway + premade catalog + user islands + translations
                    ↓
Study flow: Today → meanings → shadow → recall → SRS review
                    ↓
TTS: /api/tts → Fish Audio → R2 + audio_metadata
AI: /api/ai/* + /api/translate → OpenAI → optional shared pools
```

### Data Composition

The app never stores a monolithic dataset per user. Instead:

```
Composed Dataset (runtime) =
  Shared Main Pathway (public, all users)
  + Shared Premade Catalog (public, merged into islands)
  + User Islands (per-user, synced)
  + Sentence Translations (per-user dialect translations + shared pool)
```

User sync only stores `UserLibrary` (islands + translations), `UserProgress`, and `AppStats`.

### Local Storage (IndexedDB)

- **DB name:** `japanese-learning`, version 2
- **Stores:** `dataset`, `progress`, `stats`, `audioCache`, `syncQueue`, `meta`
- **Repositories:** `dataset-repository`, `progress-repository`, `stats-repository`, `audio-cache-repository`, `sync-queue-repository`

### Cloud Storage (Supabase)

| Table | Purpose | Access |
|-------|---------|--------|
| `user_datasets` | User islands + translations (jsonb) | Per-user RLS |
| `user_progress` | Sentence progress, batch config, settings (jsonb) | Per-user RLS |
| `user_stats` | Mode sessions, daily snapshots, streaks (jsonb) | Per-user RLS |
| `audio_metadata` | TTS hash → R2 key mapping | Authenticated read |
| `shared_pathway` | Main curriculum (id='main') | Public read |
| `shared_sentence_translations` | Community translation pool | Public read |
| `user_island_suggestions` | Cached AI island suggestions | Per-user RLS |
| `shared_premade_catalog` | Premade island catalog (referenced in code, no migration file) | Public read |

### Sync Flow

1. **Write:** local save → enqueue to `syncQueue` → debounced flush (2.5s) → POST `/api/sync`
2. **Read:** `pullRemoteIfNewer()` compares local `meta` timestamps vs remote `updated_at`
3. **Manual sync:** push queue + pull remote + `syncAudioToCloud()` (batch TTS upload)
4. **Merge:** `merge-remote-progress.ts` preserves local browse UI preferences
5. **Shared content:** pathway, premade catalog, translations pulled separately (not in user sync)

### Audio Pipeline

```
Client requests audio
  → Check IndexedDB cache
  → POST /api/tts
    → Check R2 (hash-based key: audio/{hash}.mp3)
    → Check local filesystem (dev)
    → Generate via Fish Audio API
    → Store in R2 + audio_metadata table
    → Return audio/mpeg
  → Cache in IndexedDB
  → Play via AudioSessionManager (global player)
```

**Fish Audio config:** separate voice IDs for standard/Kansai, speaker A/B, model header, temperature/speed/volume tuning.

---

## Part 5: App Routes & Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `TodayScreen` | Daily study plan checklist (home) |
| `/batch` | `BatchSelector` → `StudyUnitList` | Islands hub — pathway batches, premade, user islands |
| `/batch/pathway` | Redirect → `/batch` | Legacy redirect |
| `/batch/island/[key]` | `IslandDetailScreen` | Island detail — subtopics, batch controls, study actions |
| `/batch/folder/[id]` | `PremadeFolderDetailScreen` | Premade catalog folder detail |
| `/recall` | `ActiveRecallMode` | Active recall — `?ids=`, `?mode=review\|return` |
| `/listen` | Listen/shadow UI | `?step=meaning` or `?step=shadow` |
| `/library` | `LibraryView` | Searchable sentence library with filters |
| `/weak` | Weak sentences view | Sentences rated ≤ 2 stars |
| `/progress` | Progress charts | Streak, mastery, mode session stats |
| `/prepare` | `PreInputHelper` | Pre-study transcript analysis |
| `/import` | Import screen | Import JSON datasets/islands |
| `/guide` | `MethodGuide` | Kotoshima method explanation |
| `/settings` | Settings screen | Account, sync, batch size, export |
| `/settings/preferences` | Preferences | Font, dialect, notifications |
| `/placement` | Redirect → `/batch` | Placement UI exists in components but route disabled |

### Navigation Structure

**Primary nav:** Today, Islands, Active Recall, Shadowing, Library, Progress
**Tools nav:** Pre-study, Weak sentences
**Footer nav:** Settings, Guide, Import

---

## Part 6: API Reference

### Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js handlers (Google OAuth) |

### Sync

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/sync` | — | `{ dataset, progress, stats, localMeta }` each with `{ data, updatedAt }` |
| POST | `/api/sync` | `{ items: [{ table, payload }] }` | `{ ok, results: [{ table, ok, error? }] }` |
| GET | `/api/sync/session` | — | `{ authenticated, email, supabaseConfigured, tablesReady, tablesError }` |

Tables: `user_datasets`, `user_progress`, `user_stats`

### Shared Content

| Method | Endpoint | Query | Response |
|--------|----------|-------|----------|
| GET | `/api/pathway` | `?since=` (304 support) | `{ main_pathway: { description, batches[] }, updatedAt }` |
| GET | `/api/premade-catalog` | `?since=` | `PremadeCatalog & { updatedAt }` |
| GET | `/api/translations` | `?since=` | `{ translations: Record<sentenceId, SentenceDialectTranslations>, updatedAt }` |

Fallbacks: `public/main-pathway.json`, `public/premade-catalog.json`

### TTS

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/tts` | `{ sentenceId, japanese, reading?, phonetic_reading?, placeholders?, learnerName?, dialect?, speaker?, register?, tags?, context_notes?, english?, force?, ttsSource? }` | `audio/mpeg` binary; headers: `X-Audio-Cached`, `X-Audio-Hash` |

Errors: `MISSING_READING` (422), `QUOTA_EXCEEDED` (429), `NOT_CONFIGURED` (503)

### Translation

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/translate` | `{ sentences: SeedSentence[], dialect?: "standard"\|"kansai" }` (max 30) | `{ translations: Record<id, TranslatedFields> }` |

### AI Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/ai/chat` | `{ messages, context: TutorContext, datasetSummary }` | `text/plain` stream |
| POST | `/api/ai/island` | `{ theme, sentenceCount?, difficultyRange?, levelMode?, fluencyLevel?, jlptLevel?, extraInstructions?, sentenceCatalog, existingIslandKeys? }` | `{ islandKey, description, subtopics, sentences, reusedIds, newCount, skippedCount }` |
| POST | `/api/ai/island-kanji` | `{ title, description, subtopics? }` | `{ themeKanji }` |
| POST | `/api/ai/island-suggestions` | `{ existingIslandKeys, pathwayBatchTitles, pathwaySubtopics?, refresh? }` | `{ suggestions: [{theme, reason}], cached }` |
| POST | `/api/ai/sentence-intent` | `{ english, islandName?, register?, conversationHistory? }` | `{ status: "ready"\|"clarify", question?, refinedEnglish?, suggestedRegister?, suggestedContextNotes? }` |
| POST | `/api/ai/sentence-review` | `{ english, register?, contextNotes?, islandName? }` | `{ correctedEnglish, grammarNotes[], toneQuestions[], suggestedRegister, suggestedContextNotes?, hasIssues }` |
| POST | `/api/ai/transcript-segment` | `{ transcript, maxSentences? }` | `{ suggestedName, description, sentences: [{japanese, english, reading, romaji?, register, context_notes?, reason}] }` |
| POST | `/api/ai/translate-name` | `{ name }` | `{ kana }` |

---

## Part 7: Services Layer (`lib/services/`)

| Service | Key Functions | Purpose |
|---------|---------------|---------|
| `today-plan-service` | `buildTodayPlan`, `getTodayPlanStepAccess`, `getWeakSentenceIds` | Daily checklist with gated step chain |
| `study-flow-service` | `getStudyFlowState`, `getNextStudyHref`, `getNextStepAfterShadow` | Study step state machine |
| `daily-focus-service` | `resolveDailyBatchConfig`, `getReturnReviewIds`, `needsStudySwitch` | Daily batch resolution, return reviews |
| `daily-progress-service` | `getStudyStreak`, `getDailyStudyStatus`, `mergeTodayTaskCompletion` | Streak, daily task tracking |
| `batch-service` | `initializeBatch`, `retireSentence`, `resumeOrInitializeBatch`, `shouldRetire` | Active batch lifecycle (retire at rating ≥ 4) |
| `srs-service` | `scheduleRetirementSrs`, `getDueRecallIds`, `getDueReviewIds`, `onCorrectRecall` | SRS intervals [1,3,7,14,30,60] days |
| `recall-service` | `recordRecallAttempt`, `getRecallAccuracy`, `markMastered` | Recall tracking and mastery |
| `rating-service` | `suggestRating`, `applyRating` | Star rating logic |
| `bulk-rating-service` | `bulkApplySentenceRatings`, `rateIslandSentences`, `refillActiveBatchOnce` | Bulk operations |
| `placement-service` | `applyPathwayPlacement`, `selectProbeSentences`, `shouldShowPlacement` | Pathway placement for returning learners |
| `study-focus-service` | `isIslandComplete`, `isPathwayBatchComplete`, `getSuggestedPathwayBatch` | Completion tracking |
| `study-unit-service` | `getStudyUnits`, `groupStudyUnits`, `filterStudyUnits` | Unified pathway + island study units |
| `study-playlist-service` | `buildPlaylistFromSentences`, `buildPlaylistFromUnits` | Casual listen playlists |
| `casual-listen-service` | `recordCasualListen`, `getTodayCasualListenCount` | Track casual listening |
| `pre-input-service` | `analyzeTranscript`, `findStudyCandidates` | Transcript pre-study analysis |
| `translation-service` | `translateSentences`, `fetchTranslations`, `getUntranslated` | Translation orchestration |
| `dialect-translation-service` | `applyDialectTranslations`, `hasTranslationForDialect` | Per-dialect translation storage |
| `shared-translations-service` | `fetchSharedTranslations`, `pullSharedTranslationsIntoLibrary` | Shared translation pool |
| `shared-pathway-service` | `composeDataset`, `fetchSharedMainPathway`, `resolveComposedDataset` | Dataset composition |
| `shared-premade-service` | `fetchSharedPremadeCatalog`, `filterUserIslands` | Premade catalog |
| `dataset-mutation-service` | `addIsland`, `appendSentenceToIsland`, `slugifyIslandKey` | Island/sentence CRUD |
| `manual-island-service` | `createManualSentence`, `buildManualIsland` | Hand-built islands |
| `transcript-island-service` | `createTranscriptSentence`, `draftsToSentences` | Transcript → island conversion |
| `island-folder-service` | `createIslandFolder`, `assignIslandToFolder`, `deleteIslandFolder` | Island folder management |
| `import-service` | `parseImportPayload`, `mergeDatasets`, `combineImportPayloads` | JSON import/merge |
| `library-service` | `filterLibrarySentences`, `sortLibrarySentences`, `groupLibrarySentences` | Library browse/filter/sort |
| `learner-name-service` | `ensureJapaneseLearnerName`, `resolveJapaneseNameForUser` | `[name]` placeholder resolution |

---

## Part 8: Data Models

### Sentence

```typescript
interface SeedSentence {
  id: string;
  english: string;
  register: "casual" | "polite" | "formal";
  difficulty: number;
  category: string;
  subtopic: string;
  tags: string[];
  context_notes?: string;
  translated: boolean;
  speaker?: "A" | "B";  // narration islands
}

interface TranslatedFields {
  japanese: string;
  reading: string;       // hiragana/katakana reading
  romaji: string;
  literal_note?: string;
  phonetic_reading?: string;  // Kansai TTS accent script
  placeholders?: SentencePlaceholder[];
}

type Sentence = SeedSentence & Partial<TranslatedFields>;
```

### Island

```typescript
interface Island {
  description: string;
  subtopics: string[];
  sentences: Sentence[];
  title?: string;
  themeKanji?: string;       // 1-2 decorative kanji
  featured?: boolean;         // highlighted premade
  format?: "standard" | "narration";
  speakers?: ("A" | "B")[];
}
```

### Progress

```typescript
interface SentenceProgress {
  sentenceId: string;
  rating: number | null;          // 1-5 stars
  recallHistory: RecallAttempt[];
  meaningConfirmed: boolean;
  batchStatus: "active" | "retired" | "unseen";
  srsNextReview: string | null;
  srsIntervalIndex: number;
  retiredAt: string | null;
  firstSeenAt: string | null;
  masteredAt: string | null;      // rating === 5
  sourceType: "pathway" | "island";
  sourceKey: string;
}

interface BatchConfig {
  sourceType: "pathway" | "island";
  pathwayBatchNumber: number | null;
  islandKey: string | null;
  subtopic: string | null;
  batchSize: number;              // 10-75
  activeSentenceIds: string[];
}
```

### Settings

```typescript
interface AppSettings {
  batchSize: number;
  showKansaiDialect: boolean;
  kansaiAsPrimary: boolean;
  notifications: NotificationPreferences;
  displayName?: string;
  japaneseNameReading?: string;
  onboardingCompleted?: boolean;
  placementCompleted?: boolean;
  placement?: PlacementResult;
  uiFont?: "bitter" | "red-hat-display";
  islandBrowseDisplay?: "en" | "jp" | "both";
  casualPlaylistPauseMs?: number;
  casualPlaylistPlaybackRate?: number;
}
```

### Stats

```typescript
interface AppStats {
  modeSessions: ModeSession[];     // listen, shadow, recall, review, meaning_check, library, weak
  dailySnapshots: DailySnapshot[];
  masteryEvents: MasteryEvent[];
  activeDays: string[];
}
```

---

## Part 9: User Flows

### New User Flow

```
1. Land on Today page (empty state)
2. Onboarding tour (12 steps)
3. Browse Islands hub → see pathway batches + premade islands
4. Select first batch → confirm meanings → shadow → recall
5. Optional: sign in with Google for cloud sync
6. Optional: placement to skip known pathway batches
7. Optional: create custom island via AI or manual
```

### Daily Study Flow

```
1. Open app → Today page shows prioritized checklist
2. "Confirm meanings" → /listen?step=meaning → mark each sentence understood
3. "Listen & shadow" → /listen?step=shadow → listen + repeat each sentence
4. "Active recall" → /recall → English prompt → produce Japanese → rate 1-5
5. "Review" (if due) → /recall?mode=review → SRS review of retired sentences
6. Today marks study complete → streak increments
```

### Island Creation Flow

```
1. Islands hub → "Create island"
2. Choose: AI-generated or manual
3. AI path: enter theme → AI generates sentences → review → save
4. Manual path: add sentences one by one (with AI intent/review assist)
5. Translate untranslated sentences (standard and/or Kansai)
6. Generate TTS audio
7. Start studying the island as a batch
```

### Transcript → Island Flow

```
1. Pre-study page → paste Japanese transcript
2. AI segments into study sentences
3. Review/edit suggested sentences
4. Create island from selections
5. Study as normal batch
```

---

## Part 10: Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Auth (Google OAuth via Auth.js)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Cloudflare R2 (audio CDN)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Fish Audio TTS
FISH_AUDIO_API_KEY=
FISH_AUDIO_VOICE_ID=
FISH_AUDIO_KANSAI_VOICE_ID=
FISH_AUDIO_VOICE_ID_B=
FISH_AUDIO_KANSAI_VOICE_ID_B=
FISH_AUDIO_MODEL=s2.1-pro-free

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini

# Optional
NEXT_PUBLIC_SITE_URL=
```

---

## Part 11: Key Questions for Strategic Planning

Use these when discussing with Claude or advisors:

1. **Positioning:** Is "Japanese sentence batches + shadow + recall + islands" a strong enough wedge vs Anki/Migaku/LingQ?
2. **Pricing:** Free + $11.99/mo Plus, or add Pro tier? What AI/TTS limits per tier?
3. **Go-to-market:** Reddit beta → 10 users → iterate, or build landing page first?
4. **Unit economics:** What does one active user cost in OpenAI + Fish Audio per month?
5. **Retention:** What makes someone come back daily for 30+ days?
6. **Content moat:** Is the shared pathway + premade catalog + translation pool a defensible asset?
7. **Legal:** NLL/Language Islands method attribution — any licensing concerns for commercial use?
8. **Scope:** Stay Japanese-only forever, or plan multi-language later?
9. **Mobile:** PWA sufficient, or need native iOS/Android app?
10. **Team:** Solo forever, or find co-founder for marketing/distribution?

---

## Part 12: File Structure Summary

```
app/                    # Next.js App Router pages
  api/                  # 16 API routes (auth, sync, tts, translate, ai/*)
  batch/                # Islands hub + detail pages
  recall/               # Active recall
  listen/               # Shadowing + meaning check
  library/              # Sentence library
  progress/             # Stats dashboard
  prepare/              # Pre-study transcript
  import/               # Data import
  guide/                # Method guide
  settings/             # Settings + preferences
  placement/            # (redirects to /batch)
components/
  mobile/               # Mobile-specific screens
  desktop/              # Desktop-specific screens
  ai/                   # Tutor chat, island creation
  study/                # Study flow components
  library/              # Library browse
  recall/               # Active recall UI
  islands/              # Island management
  settings/             # Settings UI
  layout/               # Shell, nav, headers
  providers/            # App, auth, tutor, onboarding providers
  pwa/                  # Service worker provider
lib/
  services/             # 25+ business logic services
  ai/                   # OpenAI client, prompts, schemas
  audio/                # TTS generation, playback, prosody
  db/                   # IndexedDB repositories
  sync/                 # Cloud sync orchestration
  supabase/             # Supabase client, admin, data access
  storage/              # R2 client
  auth/                 # Auth provisioning
  validation/           # Zod schemas
  constants/            # Dialect, branding, notifications
  content/              # Onboarding steps
types/                  # TypeScript type definitions
scripts/                # 15+ admin/maintenance scripts
supabase/migrations/    # 4 SQL migration files
public/                 # Static assets, PWA manifest, SW, pathway JSON
```

---

*Document generated from codebase analysis. Last updated: July 2026.*
