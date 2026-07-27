# Matomari — Technical & Cost-Structure Report

**Audience:** Business / pricing advisor (non-engineering)  
**Purpose:** Ground truth for designing subscription plans with expense buffers and margin — **not** a proposed pricing ladder.  
**As of:** 25 July 2026  
**Product stage:** Newly launched / pre-scale — **no observed production usage data** for tokens, audio bytes, or retention. Many unit costs below are **calculated from code + public vendor list prices**, and are labeled accordingly.

---

## Executive snapshot (for orientation)

| Topic | Current state |
|--------|----------------|
| App stack | Next.js 16 web app on Vercel; Supabase (Postgres + Auth); Cloudflare R2 for audio; Google sign-in via Auth.js |
| Primary variable costs | **OpenAI** (text) + **Fish Audio** (TTS). Everything else is mostly fixed/low-meter until scale. |
| Default OpenAI model in code | `gpt-5.4-mini` (overridable via `OPENAI_MODEL`) |
| Default Fish model in code | `s2.1-pro-free` (overridable via `FISH_AUDIO_MODEL`) |
| Billing / Paddle | **Paddle Billing** — Plus/Pro via `/api/webhooks/paddle` |
| App-enforced usage caps | **Mostly not implemented** — soft/UI/Zod caps only; marketing “Free/Plus” limits are **not** enforced |
| Fish free TTS | Officially **$0 / M UTF-8 bytes** for `s2.1-pro-free`, under Fair Use; free window currently stated through **31 August 2026** (subject to Fish’s notices) |
| Paid TTS fallback | `s2.1-pro` / `s2-pro` / `s1` all list at **$15.00 / M UTF-8 bytes** |

---

## 1. System architecture overview

### 1.1 High-level stack

| Layer | What Matomari uses |
|--------|---------------------|
| Frontend | **Next.js `16.2.10`**, React `19.2.4`, App Router. Marketing site + signed-in study app under `app/(marketing)` and `app/(app)`. |
| Backend / API | Next.js Route Handlers under `app/api/**` (no separate application server). |
| Auth | **Auth.js (NextAuth v5)** + Google OAuth; each Google user is provisioned into **Supabase Auth** (`auth.users`) for UUID foreign keys. Session carries `supabaseUserId`. |
| Database | **Supabase Postgres** with RLS on user tables; most server paths use the **service-role** (“admin”) client and bypass RLS. |
| Object storage | **Cloudflare R2** (S3-compatible), default bucket name `matomari-audio`, keys like `audio/{hash}.mp3`. Signed URLs (~1 hour TTL) for playback. |
| Hosting | Deployed as a **Vercel** project (cron config in `vercel.json`; production domain referenced as `www.matomari.com`). |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` in root layout. **No Sentry / dedicated error product** in dependencies. |
| Payments | **Paddle Billing** (`@paddle/paddle-node-sdk`); `user_subscriptions` stores paddle customer/subscription IDs. |

### 1.2 Database shape (post-migration, including admin work)

Core tables (conceptual — not every column):

| Area | Tables |
|------|--------|
| User content | `user_datasets` (JSON library of scenes), `user_progress`, `user_stats`, `user_sentences`, `user_scene_suggestions` |
| Shared content | `shared_pathway`, `shared_premade_catalog`, `shared_sentence_translations`, `canonical_sentences`, `canonical_sentence_translations` |
| Audio | `audio_metadata` (content-addressed by text hash + R2 key + `byte_size`), `audio_sentence_bindings`, `tts_generation_jobs` |
| Sharing | `profiles` (includes **`role` enum**: `user` \| `admin` \| `support`), `scene_shares`, `shared_scene_memberships` |
| Admin | `admin_audit_log` |
| Misc | `content_version` (invalidation), translation status/stale flags on canonical rows |

Entitlements live in `user_subscriptions` with Paddle customer/subscription IDs. Invoices are managed in Paddle.

### 1.3 Typical request flows for the two expensive operations

#### (A) Generating a new scene’s sentences (text)

1. **Frontend (signed-in app):** User opens scene creation, picks theme, duration tier (`quick` / `standard` / `deep`), difficulty mode, format (`standard` or `narration`), optional extra instructions. Client sends catalog of existing sentences for reuse.
2. **API:** `POST /api/ai/scene`  
   - **Auth:** Currently **not required** on this route (cost/abuse risk — see §7).  
   - Validates body (Zod): AI `sentenceCount` optional but if present **5–60**; duration tiers only `quick|standard|deep`.
3. **OpenAI call:** One `chat.completions.create` with model `getOpenAIModel()` → default **`gpt-5.4-mini`**, JSON object response. Prompt includes instructions + up to **200** catalog sentences.
4. **Server post-process:** Maps reused catalog IDs vs new sentences; returns scene payload to client.
5. **Client persistence:** Scene is stored in the user’s library (local + sync to `user_datasets` via `/api/sync` / bootstrap). **Japanese text is not finished yet** — translation is a separate step.
6. **Translation (second OpenAI cost center):** Client batches untranslated sentences (batch size **15**) to `/api/translate` (auth required when online-first). Results may land in shared/canonical translation tables so later users can skip OpenAI on cache hit.

**Important cost framing:** Scene generation is **one OpenAI call for the whole scene**, not one call per sentence. Per-sentence text cost ≈ (scene-gen cost ÷ N) + (translation cost for that sentence if not cached).

#### (B) Generating audio for those sentences

1. **Frontend / sync:** After Japanese (and dialect variants) exist, study/listen flows request audio via resolve/TTS paths (e.g. `/api/audio/resolve`, `/api/tts`) or background `tts_generation_jobs` worker.
2. **Cache check:** App builds a content-addressed key from TTS settings fingerprint + spoken text (+ speaker/narration mode as applicable). Looks up **R2** / `audio_metadata`.
3. **Cache hit:** Return signed URL — **no Fish Audio charge**.
4. **Cache miss:** Call Fish Audio `POST https://api.fish.audio/v1/tts` with header model = `getFishAudioModel()` → default **`s2.1-pro-free`**. Store MP3 in R2; upsert `audio_metadata` including `byte_size`.
5. **Quota handling:** Fish HTTP 402/429 mapped to app TTS quota errors; jobs back off (worker path). **This is provider throttling, not a Matomari billing plan.**

Narration scenes may attach Fish bracket tags / shared narration scripts; identical spoken scripts can share one audio object across sentences/users (`spoken-script` / `shared-narration` cache modes).

---

## 2. Third-party services and models in use

### 2.1 OpenAI

| Item | Detail |
|------|--------|
| **What for** | Scene generation, Japanese translation, AI tutor chat, name translation, transcript segmentation, sentence review/intent, scene suggestions, kanji theme helper, cron content retranslation |
| **Model wired in code** | Default **`gpt-5.4-mini`** (`lib/env.ts`). Override: env `OPENAI_MODEL`. No per-route hardcodes found. |
| **Official list price** (OpenAI API pricing page, fetched 25 Jul 2026) | **`gpt-5.4-mini`:** **$0.75 / 1M input tokens**, **$0.075 / 1M cached input**, **$4.50 / 1M output tokens** ([OpenAI Pricing](https://developers.openai.com/api/docs/pricing)) |
| **Rate limits** | Account-tier dependent; **not encoded** in Matomari. |
| **Promo / temporary pricing** | None specifically relied on in code. |

**Note:** An internal script `scripts/estimate-translation-cost.ts` still assumes older **$2.50 / $15** rates (full `gpt-5.4`-class), which **do not match** the current default mini model. Do not use that script’s dollar outputs without updating rates.

### 2.2 Fish Audio (TTS)

| Item | Detail |
|------|--------|
| **What for** | All sentence / narration speech synthesis |
| **Model wired in code** | Default **`s2.1-pro-free`** (`lib/env.ts`). Env override `FISH_AUDIO_MODEL`. `.env.example` documents paid alternatives `s2.1-pro`, `s2-pro`, `s1`. |
| **Confirmed (not historical):** | Code default is **`s2.1-pro-free`**, **not** `s2-pro`. |
| **Official API pricing** ([Fish Pricing & Rate Limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits), fetched 25 Jul 2026) | `s2.1-pro` **$15.00 / M UTF-8 bytes**; `s2.1-pro-free` **$0.00 / M UTF-8 bytes**; `s2-pro` **$15.00 / M UTF-8 bytes**; `s1` **$15.00 / M UTF-8 bytes**. Billing is on **input text UTF-8 bytes**, not output audio length. |
| **Free-tier / promo terms** | Blog ([S2.1 Pro free API](https://fish.audio/blog/s2-1-pro-free-api/)): free via `s2.1-pro-free`, no hard character cap under **Fair Use**; **no SLA / latency guarantees**; data may be retained for model improvement; commercial restrictions (e.g. products **>$1M ARR** should contact Fish). **Latest stated free-access extension: through 31 August 2026**, with “advance notice” before changes. Earlier blog lines mentioned July 24 / end of July — treat **31 Aug 2026** as the current public end of the free window, and verify again before locking a cost model. |
| **Concurrency** | Starter: **5 concurrent** requests if &lt; $100 prepaid; higher tiers at $100 / $1,000 prepaid. Matomari sync uses low concurrency (audio sync concurrency **2**). |

**Pricing-advisor flag:** Current unit economics for audio assume **$0 TTS**. That is a **temporary / policy-dependent** assumption, not a durable COGS floor. Plan scenarios at **$15 / M bytes** as the steady-state paid rate for the same product family.

### 2.3 Supabase

| Item | Detail |
|------|--------|
| **What for** | Postgres, Auth users, RLS, realtime-ish sync backbone |
| **Public list pricing** ([supabase.com/pricing](https://supabase.com/pricing)) | **Free:** $0 (500 MB DB, 5 GB egress, pauses after inactivity, 2 active projects). **Pro:** from **$25/month** (8 GB disk, 250 GB egress, etc.). |
| **Which plan Matomari is on today** | **Needs verification** from the project’s Supabase billing dashboard — not encoded in repo. |

### 2.4 Cloudflare R2

| Item | Detail |
|------|--------|
| **What for** | Cached MP3 storage + delivery via signed URLs |
| **Official pricing** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/), updated May 28, 2026) | Storage **$0.015 / GB-month** (Standard); Class A **$4.50 / M**; Class B **$0.36 / M**; **egress to Internet: free**. Free tier: 10 GB-month storage, 1M Class A, 10M Class B / month. |

### 2.5 Vercel

| Item | Detail |
|------|--------|
| **What for** | Hosting, serverless/edge functions, cron, Web Analytics / Speed Insights |
| **Public list pricing** ([vercel.com/pricing](https://vercel.com/pricing)) | **Hobby:** Free (hard caps). **Pro:** **$20 / user / month** + usage beyond included credit. |
| **Cron in repo** | Daily `GET /api/cron/content-invalidation` at `0 3 * * *` (can trigger OpenAI retranslation batches). TTS worker cron is **not** in `vercel.json` (manual / script invocation). |
| **Which plan today** | **Needs verification** from Vercel team billing. |

### 2.6 Google OAuth / Auth.js

No per-request Google API fee for standard OAuth sign-in in normal volumes. Auth.js itself is free/open-source.

### 2.7 Not present (relevant absences)

- Paddle / payment processor  
- Transactional email product  
- Sentry / Datadog / similar  
- In-app metered cost logging (`apiCostTracking` explicitly null in admin health)

---

## 3. Cost per unit of activity

> **Method note:** Token counts are **estimated** (character÷4 heuristic + prompt structure), **not measured** from production logs. Treat as planning inputs with a **safety buffer**, not accounting-grade COGS.  
> OpenAI rates: **`gpt-5.4-mini`** at **$0.75 / $4.50 per 1M** (input/output).  
> Fish paid rate: **$15 / M UTF-8 bytes** of **input text**.  
> Japanese sentence length sample (10 marketing-style lines): **avg ~42.3 UTF-8 bytes** (range 24–66). Narration tags add more (often ~+18 bytes in toy examples). **Needs verification** against real `audio_metadata` / spoken-script lengths once traffic exists.

### 3.1 Cost to generate one sentence’s **text**

Text COGS has **two** OpenAI components:

#### A) Share of scene-generation call

| Assumption | Value | Confidence |
|------------|-------|------------|
| Input tokens per scene call (catalog ~200 + instructions) | **~9,500** | Estimated, not measured |
| Output tokens | **~50 × N** (≈200 chars JSON/sentence ÷ 4) | Estimated |
| Model | `gpt-5.4-mini` | Confirmed default |

Illustrative scene-gen cost (estimated):

| Sentences in scene (N) | Est. scene-gen $ | Est. $ / sentence (gen only) |
|-------------------------|-------------------|------------------------------|
| 10 | ~$0.0095 | ~$0.00095 |
| 20 | ~$0.0117 | ~$0.00059 |
| 22 | ~$0.0122 | ~$0.00055 |
| 45 | ~$0.0173 | ~$0.00039 |
| 50 | ~$0.0185 | ~$0.00037 |
| 60 (AI Zod max) | ~$0.0207 | ~$0.00034 |

#### B) Translation call (if not served from shared cache)

| Assumption | Value | Confidence |
|------------|-------|------------|
| Batch size | **15** sentences / request | Confirmed in code |
| Output tokens / sentence | **~130** | Heuristic from internal estimate script — **needs measurement** |
| Input | System + JSON chunk | Estimated |

Illustrative translation cost at `gpt-5.4-mini` rates: **~$0.00064 per sentence** when all are cache misses.

#### Combined text COGS (cache miss, estimated)

| Scenario | Est. text $ / sentence |
|----------|-------------------------|
| New sentence on a Standard (~22) scene | ~$0.00055 + ~$0.00064 ≈ **$0.0012** |
| Reused catalog ID with existing shared translation | ≈ **scene-gen share only** (can approach ~$0.00055 or less); translation **$0** |
| Fully cached shared translation + no new English | Can be **near $0** OpenAI for that line |

**Dialect risk:** If both Standard and Kansai translations are generated for the same English line, translation OpenAI cost can **roughly double** for that line. **Needs product confirmation** of how often dual-dialect is generated for new scenes.

### 3.2 Cost to generate one sentence’s **audio**

Fish bills **UTF-8 bytes of the text sent to TTS** (including any Fish tags in the spoken script).

| Scenario | Bytes / sentence (planning) | `s2.1-pro-free` | Paid `s2.1-pro` / `s2-pro` ($15/M) |
|----------|-----------------------------|-----------------|-------------------------------------|
| Plain Japanese, avg sample | **42.3** | **$0.00** | **~$0.000635** |
| With light tags (illustrative) | **~50–75** | **$0.00** | **~$0.00075–$0.00113** |
| Longer study lines / heavy tags | **Needs verification** | $0.00 | Scales linearly with bytes |

**Audio file storage (R2)** after generation is separate and tiny at early scale (see §3.5). Playback egress on R2 is **$0**.

### 3.3 Cost per scene by size tier

**Defined AI duration tiers in code** (`lib/constants/scene-generation.ts`):

| Tier | Label | Target count | Soft range (prompt/UI only) |
|------|-------|--------------|-----------------------------|
| `quick` | Quick | **10** | 6–14 |
| `standard` | Standard | **22** | 16–30 |
| `deep` | Deep dive | **45** | 35–55 |

**There is no AI “Max / 500” duration tier.**  
`MAX_SCENE_SENTENCE_COUNT = 500` exists for **manual/library** scene size; the scene **AI API rejects** counts outside **5–60**. Pricing models that assume AI-generated 500-sentence scenes are **not aligned with current product code**.

Below: **estimated full COGS** assuming (1) all sentences are **new** English, (2) all need translation (no shared hit), (3) all need Fish (no audio cache), (4) single dialect, (5) plain ~42.3-byte Japanese, (6) `gpt-5.4-mini`.

| Scene size | Est. OpenAI (gen+translate) | Fish free (`s2.1-pro-free`) | Fish paid ($15/M) | **Total @ Fish free** | **Total @ Fish paid** |
|-------------|-----------------------------|-----------------------------|-------------------|-----------------------|------------------------|
| Quick **10** | ~$0.016 | $0 | ~$0.0063 | **~$0.016** | **~$0.022** |
| Standard **22** | ~$0.026 | $0 | ~$0.0140 | **~$0.026** | **~$0.040** |
| Deep **45** | ~$0.046 | $0 | ~$0.0286 | **~$0.046** | **~$0.075** |
| Marketing free cap **20** | ~$0.025 | $0 | ~$0.0127 | **~$0.025** | **~$0.037** |
| Marketing Plus claim **50** | ~$0.050 | $0 | ~$0.0317 | **~$0.050** | **~$0.082** |
| AI max **60** | ~$0.059 | $0 | ~$0.0381 | **~$0.059** | **~$0.097** |
| Hypothetical **500** (manual only; not AI path) | N/A as AI | $0 | ~$0.317 | N/A | Audio alone **~$0.32** + huge OpenAI if ever AI-generated |

**Narration scenes:** Expect **higher** OpenAI output tokens (speaker, pause, tags) and **higher** Fish bytes (tags + possibly longer scripts). **No measured delta yet** — flag as uplift risk (suggest planning buffer **+20–50%** until measured).

### 3.4 Free-tier vs paid-tier caps (as defined today)

| Cap | Source | Enforced in product? |
|-----|--------|----------------------|
| Free: “3 scenes at a time”, “Up to **20** sentences per scene” | Marketing placeholder (`marketing-pricing.ts`) | **No** |
| Plus: “Up to **50** sentences”, “Coming soon”, placeholder **$9/mo** | Marketing placeholder | **Yes** — Paddle sandbox/live via env |
| AI generation hard max | Zod **60** | **Yes** (API validation) |
| Library/manual max | **500** sentences | Soft product constant; not a billing entitlement |

So “cost at free-tier cap (~20)” and “paid-tier cap (~50)” are **useful planning anchors from marketing copy**, but **not** currently what the backend enforces.

### 3.5 Other per-request / metered costs

| Cost center | Status | Notes for pricing |
|-------------|--------|-------------------|
| Supabase DB read/write | Metered on egress/storage beyond plan | Early stage usually inside Free/Pro inclusions — **verify plan** |
| R2 storage | $0.015/GB-mo after free 10 GB | One ~30–80 KB MP3 × thousands of unique lines still small early on |
| R2 Class B reads (playbacks) | $0.36 / M after free 10M | Can matter at high listen volume |
| R2 egress | **$0** | Favorable vs typical CDN egress |
| Vercel function CPU / invocations | Plan-dependent | Scene + translate + TTS resolve calls scale with usage |
| Cron retranslation | OpenAI batches (default batch size up to 20, max 50 in cron path) | Fixed-ish ops cost, not per subscriber |
| Tutor chat / other AI routes | OpenAI tokens | **Open-ended**; mostly **unauthenticated** today — abuse = unbounded COGS risk |
| Domain `www.matomari.com` | Fixed annual | **Needs verification** of registrar fee |
| Email / SMS | None | — |

---

## 4. Current usage limits and safety mechanisms

### 4.1 Implemented today (exact numbers from code)

| Mechanism | Exact value | Notes |
|-----------|-------------|-------|
| AI scene `sentenceCount` | min **5**, max **60** | Zod on `/api/ai/scene` |
| Duration tiers | targets **10 / 22 / 45** | Soft min/max are **not** server-enforced |
| Manual/library scene size | min **5** (manual min **1**), max **500**, default **20** | Study constants |
| Translation client batch | **15** | |
| Audio sync concurrency | **2** | Client-side |
| TTS job `max_attempts` | **8** | DB default |
| TTS worker batch | default **8**, API allow **1–40** | |
| Fish quota errors | HTTP **429** path | Provider limit, not Matomari plan |
| Content-addressed audio cache | By spoken text + TTS fingerprint | Prevents re-billing Fish on identical scripts |
| Shared translation cache | Shared/canonical tables | Skips OpenAI when already translated |
| Online-first translate/TTS | Session required | |
| Admin roles | `user` / `admin` / `support` | Not a usage quota |

### 4.2 Marketing / planned but **NOT** implemented

| Item | Status |
|------|--------|
| Free: max 3 scenes at a time | **Not enforced** |
| Free: 20 sentences / scene entitlement | **Not enforced** |
| Plus: 50 sentences / scene | **Not enforced**; checkout **Coming soon** |
| Daily / monthly generation quotas | **Not implemented** (no rate-limit middleware/tables found under `app/api`) |
| Concurrent scene-generation caps | **Not implemented** |
| Paddle entitlements / webhooks | **Implemented** (`/api/webhooks/paddle`) |
| Delete-and-regenerate daily backstop | **Not implemented** as a dedicated control (see §7) |
| Auth on most `/api/ai/*` routes | **Missing** on scene (and several other AI routes) |

---

## 5. Shared / cached resource economics

### 5.1 How sharing changes real COGS

| Resource | Sharing mechanism | Effect on per-user cost |
|----------|-------------------|-------------------------|
| Translations | `shared_sentence_translations` / canonical tables | First translator pays OpenAI; later users with same sentence ID / durable row can pay **$0** for that translation |
| Audio | `audio_metadata` + R2 hash of spoken script + TTS settings | First synthesizer pays Fish (or $0 on free model); later identical scripts pay **$0** Fish |
| Premade / pathway content | Shared catalogs | Near-zero incremental gen cost for stock content |
| User-unique AI scenes | New English + new IDs | Full OpenAI + Fish on first materialization |

### 5.2 Quantified savings today

**Unknown / not estimable from data.** There is no production hit-rate telemetry for:

- % of scene sentences that reuse catalog IDs  
- % translation cache hits  
- % audio cache hits  
- overlap across users’ themes  

**For a pricing advisor:**  
- **Conservative (launch) model:** assume **low sharing** (mostly unique AI scenes) → use full per-scene totals from §3.  
- **Optimistic (scale) model:** shared catalog + popular themes could cut **marginal** OpenAI/Fish sharply — but **do not bank margin on this** until measured.  
- Caching **does not** protect against “delete scene → regenerate new English” loops (new IDs / new text → full cost again). Audio cache only helps when the **spoken Japanese script** (and TTS settings) match a prior object.

---

## 6. Fixed / baseline costs (non-usage-scaling)

> Actual invoices depend on which tiers are active. Figures below are **public list prices**, not Matomari’s confirmed bill.

| Item | Likely monthly | Confidence |
|------|----------------|------------|
| Vercel Hobby | **$0** (capped) | If still on Hobby — **verify** |
| Vercel Pro | **$20 / seat** + usage overages | Common for commercial apps — **verify** |
| Supabase Free | **$0** (with pause risk) | **verify** |
| Supabase Pro | **from $25** | **verify** |
| Cloudflare R2 | Often **$0** within free tier early | Grows with storage/ops |
| Domain (`www.matomari.com`) | ~**$1–2 / mo** amortized | **Needs verification** of registrar |
| Google OAuth | **$0** typical | |
| Fish / OpenAI | Variable (see §3) | Not fixed |
| Email / Sentry / Paddle fees | Paddle fee per sale; email/Sentry optional | |
| Analytics | Included with Vercel plans used | |

**Total current fixed monthly burn:** **Needs verification from live billing dashboards.**  
Plausible early-commercial floor if on **Vercel Pro + Supabase Pro**: **~$45 / month** before AI/TTS variable spend and overages. If still on free tiers: closer to **~$0–10 / month** fixed (domain + incidental).

---

## 7. Known unknowns / risk factors for pricing

1. **No real usage data** — All token/byte unit costs are **projections**. Average Japanese spoken-script length, narration tag overhead, catalog reuse rate, and dual-dialect frequency are **unmeasured**.

2. **Fish `s2.1-pro-free` is time- / policy-bounded** — Public free window currently through **31 Aug 2026**, Fair Use, weaker commercial posture, no SLA. Steady-state COGS should assume **~$15 / M UTF-8 bytes** (`s2.1-pro` or `s2-pro`). A jump from $0 → paid can **roughly add ~$0.01–$0.03 per Standard scene** of audio alone at sample lengths — small per scene, but **material at abuse or power-user volumes**.

3. **Marketing caps ≠ product enforcement** — Advisors should not assume users are limited to 3 scenes / 20 sentences until entitlement code ships.

4. **AI routes without auth** — `/api/ai/scene` (and several other AI endpoints) can be invoked without a session → **unbounded OpenAI exposure** independent of any subscription design. This is a **COGS and abuse risk**, not just a product gap.

5. **Delete-and-regenerate loop** — **No daily generation quota** is implemented. Cache only helps when content is identical. A user (or bot) can repeatedly create net-new English scenes and burn OpenAI (+ Fish when paid) without an entitlement gate.

6. **Tutor / chat and other AI surfaces** — Open-ended token usage; not included in scene unit economics. Can dominate spend for engaged users if unlimited.

7. **Narration / dialogue scenes** — Extra prompt complexity and Fish tags → higher cost than standard scenes; **delta not measured**.

8. **500-sentence “Max”** — Exists as a library constant, **not** an AI generation tier (AI max **60**). Don’t price an AI Max-500 SKU against current generation path.

9. **Cron retranslation** — Periodic OpenAI cost owned by the platform, not attributable cleanly per subscriber.

10. **Hosting plan uncertainty** — Fixed burn depends on whether production is Hobby vs Pro (Vercel) and Free vs Pro (Supabase). Confirm before setting absolute margin floors.

11. **Internal estimate scripts outdated** — `estimate-translation-cost.ts` uses wrong model price assumptions relative to current `gpt-5.4-mini` defaults.

12. **Admin “system health” has no cost telemetry** — No automatic API-cost tracking in-product yet.

---

## Appendix A — Suggested measurement checklist (before locking prices)

1. Log OpenAI `usage.prompt_tokens` / `completion_tokens` on scene + translate routes for 2–4 weeks.  
2. Persist Fish request UTF-8 byte lengths (or derive from spoken scripts) and compare to `audio_metadata.byte_size` (output size ≠ billable input).  
3. Measure cache hit rates for translations and audio.  
4. Confirm live Vercel + Supabase + Fish + OpenAI invoices.  
5. Re-check Fish free-tier end date / Fair Use / commercial terms the week before any price launch.  
6. Ship entitlement + rate limits **before** marketing Free/Plus caps are treated as real COGS controls.

---

## Appendix B — Quick reference: models & list prices used in this report

| Service | ID in Matomari default | List price used |
|---------|-------------------------|-----------------|
| OpenAI | `gpt-5.4-mini` | $0.75 / 1M in, $4.50 / 1M out ([OpenAI](https://developers.openai.com/api/docs/pricing)) |
| Fish Audio | `s2.1-pro-free` | $0.00 / M UTF-8 bytes ([Fish docs](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits)) |
| Fish Audio (paid peer) | `s2.1-pro` or `s2-pro` | $15.00 / M UTF-8 bytes (same docs) |
| R2 | bucket `matomari-audio` | $0.015/GB-mo storage; egress free ([Cloudflare](https://developers.cloudflare.com/r2/pricing/)) |

---

*End of report. No subscription tiers or retail prices are recommended in this document by design.*
