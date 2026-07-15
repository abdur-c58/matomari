/**
 * Focused verification for island sharing + generation changes.
 * Run: npx tsx scripts/verify-island-sharing-generation.ts
 */

import assert from "assert";
import {
  compileFishAudioScript,
  combineParalinguisticTags,
  sanitizeParalinguisticTags,
  legacyFishDirectivesToTags,
} from "../lib/audio/fish-audio-cues";
import { buildTtsCacheKey } from "../lib/audio/tts-config";
import {
  getIslandDurationTier,
  resolveIslandSentenceTarget,
} from "../lib/constants/island-generation";
import {
  cloneIslandForUser,
} from "../lib/services/island-sharing-service";
import {
  hashShareToken,
  newShareToken,
  sharedIslandLibraryKey,
  parseSharedIslandLibraryKey,
  ensureIslandId,
  formatCreatedBy,
  systemCreatedBy,
} from "../lib/services/island-identity-service";
import { resolveIslandSentences } from "../lib/services/dataset-mutation-service";
import { normalizeLegacySentence, isMixedDifficulty } from "../lib/sentence-utils";
import {
  parseDataset,
  validateNarrationIsland,
} from "../lib/validation/dataset-schema";
import {
  filterLibrarySentences,
  defaultLibraryFilters,
  groupLibrarySentences,
} from "../lib/services/library-service";
import type { Island, Sentence } from "../types/sentence";
import { DEFAULT_PROGRESS } from "../lib/db/index";
import { buildIslandGenerationPrompt } from "../lib/ai/prompts";
import { getSentencesForStudyUnit } from "../lib/services/study-unit-service";

function section(name: string) {
  console.log(`\n✓ ${name}`);
}

// ── Token hashing ──────────────────────────────────────────────────────────
{
  const a = newShareToken();
  const b = newShareToken();
  assert.notEqual(a, b);
  assert.equal(hashShareToken(a).length, 64);
  assert.equal(hashShareToken(a), hashShareToken(a));
  assert.notEqual(hashShareToken(a), hashShareToken(b));
  section("share token hashing");
}

// ── Shared library keys ────────────────────────────────────────────────────
{
  const key = sharedIslandLibraryKey("abc-uuid");
  assert.equal(key, "shared:abc-uuid");
  assert.equal(parseSharedIslandLibraryKey(key), "abc-uuid");
  assert.equal(parseSharedIslandLibraryKey("owned"), null);
  section("shared island library keys");
}

// ── Attribution helpers ────────────────────────────────────────────────────
{
  assert.equal(formatCreatedBy({ userId: "1", displayName: "Ada" }), "Created by Ada");
  assert.equal(formatCreatedBy(null), null);
  assert.equal(systemCreatedBy().displayName, "Kotoshima");
  const island = ensureIslandId({
    description: "x",
    subtopics: [],
    sentences: [],
  });
  assert.ok(island.id);
  section("attribution helpers");
}

// ── Duration tiers ─────────────────────────────────────────────────────────
{
  assert.equal(resolveIslandSentenceTarget("quick"), 10);
  assert.equal(resolveIslandSentenceTarget("standard"), 22);
  assert.equal(resolveIslandSentenceTarget("deep"), 45);
  assert.equal(getIslandDurationTier("quick").softMax, 14);
  section("duration tiers");
}

// ── Free-form Fish tags ────────────────────────────────────────────────────
{
  const tags = sanitizeParalinguisticTags([
    "[laughing]",
    "  whispers sweetly ",
    "",
    "laughing",
  ]);
  assert.deepEqual(tags, ["laughing", "whispers sweetly"]);

  const legacy = legacyFishDirectivesToTags({
    expression: "friendly",
    effect: "soft tone",
  });
  assert.deepEqual(legacy, ["friendly", "soft tone"]);

  const compiled = compileFishAudioScript("こんにちは。", null, ["laughing"]);
  assert.equal(compiled, "[laughing] こんにちは。");

  const compiledLegacy = compileFishAudioScript("こんにちは。", {
    expression: "happy",
    effect: "chuckling",
  });
  assert.ok(compiledLegacy.includes("[happy]"));
  assert.ok(compiledLegacy.includes("[chuckling]"));
  section("free-form paralinguistic tags");
}

// ── Narration mode + content-addressed audio reuse ─────────────────────────
{
  const combined = combineParalinguisticTags(
    ["warm, intimate late-night conversation"],
    ["laughing"]
  );
  assert.deepEqual(combined, [
    "warm, intimate late-night conversation",
    "laughing",
  ]);

  const script = compileFishAudioScript("そうだね。", null, combined);
  const first = buildTtsCacheKey(
    "island-a-001",
    script,
    "standard",
    "A",
    "spoken-script"
  );
  const second = buildTtsCacheKey(
    "island-b-099",
    script,
    "standard",
    "A",
    "spoken-script"
  );
  assert.equal(first, second);
  assert.notEqual(
    buildTtsCacheKey("island-a-001", script),
    buildTtsCacheKey("island-b-099", script)
  );
  section("narration content-addressed cache identity");
}

// ── Null / mixed difficulty normalization ──────────────────────────────────
{
  const mixed = normalizeLegacySentence({
    id: "m1",
    english: "Hello",
    register: "polite",
    difficulty: null,
    category: "greetings",
    subtopic: "hello",
    tags: [],
    translated: false,
  });
  assert.equal(mixed.difficulty, null);
  assert.ok(isMixedDifficulty(mixed.difficulty));

  const legacy = normalizeLegacySentence({
    id: "m2",
    english: "Hi",
    register: "casual",
    category: "greetings",
    subtopic: "hello",
    tags: [],
  });
  assert.equal(legacy.difficulty, 1);

  const fromString = normalizeLegacySentence({
    id: "m3",
    english: "Hey",
    register: "casual",
    difficulty: "mixed",
    category: "greetings",
    subtopic: "hello",
    tags: [],
  });
  assert.equal(fromString.difficulty, null);
  section("mixed difficulty normalization");
}

// ── Schema preserves island metadata ───────────────────────────────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    islands: {
      cafe: {
        description: "Cafe talk",
        subtopics: ["order"],
        id: "11111111-1111-4111-8111-111111111111",
        createdBy: { userId: "u1", displayName: "Ada" },
        difficultyMode: "natural",
        durationTier: "quick",
        provenance: { kind: "ai" },
        format: "standard",
        sentences: [
          {
            id: "cafe-001",
            english: "One coffee please",
            register: "polite",
            difficulty: null,
            category: "cafe",
            subtopic: "order",
            tags: ["coffee"],
            paralinguisticTags: ["soft tone"],
            translated: false,
          },
        ],
      },
    },
  });
  const island = dataset.islands.cafe;
  assert.equal(island.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(island.createdBy?.displayName, "Ada");
  assert.equal(island.difficultyMode, "natural");
  assert.equal(island.durationTier, "quick");
  assert.equal(island.sentences[0].difficulty, null);
  assert.deepEqual(island.sentences[0].paralinguisticTags, ["soft tone"]);
  section("dataset schema preserves generation metadata");
}

// ── Island narration mode is applied to every contextual turn ─────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    islands: {
      scene: {
        description: "Quiet reconciliation",
        subtopics: ["apology"],
        format: "narration",
        speakers: ["A", "B"],
        narrationMode: {
          context: "Two close friends reconciling quietly after an argument",
          toneTags: ["soft, emotionally restrained conversation"],
        },
        sentences: [
          {
            id: "scene-001",
            english: "I'm sorry.",
            register: "casual",
            difficulty: 3,
            category: "relationships",
            subtopic: "apology",
            tags: [],
            paralinguisticTags: ["hesitating"],
            speaker: "A",
            narrationAudio: { pauseAfterMs: 800 },
            translated: false,
          },
        ],
      },
    },
  });
  const [turn] = getSentencesForStudyUnit(dataset, {
    kind: "island",
    key: "scene",
  });
  assert.deepEqual(turn.paralinguisticTags, [
    "soft, emotionally restrained conversation",
    "hesitating",
  ]);
  section("island narration mode applies to turns");
}

// ── Library excludes mixed from numeric filters ────────────────────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    islands: {
      mixed: {
        description: "m",
        subtopics: ["a"],
        sentences: [
          {
            id: "n1",
            english: "A",
            register: "polite",
            difficulty: null,
            category: "c",
            subtopic: "a",
            tags: [],
            translated: false,
          },
          {
            id: "n2",
            english: "B",
            register: "polite",
            difficulty: 2,
            category: "c",
            subtopic: "a",
            tags: [],
            translated: false,
          },
        ],
      },
    },
  });
  const filtered = filterLibrarySentences(
    [
      { ...dataset.islands.mixed.sentences[0], sourceType: "island", sourceKey: "mixed" },
      { ...dataset.islands.mixed.sentences[1], sourceType: "island", sourceKey: "mixed" },
    ],
    DEFAULT_PROGRESS,
    { ...defaultLibraryFilters, difficultyMin: 1, difficultyMax: 3 }
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "n2");

  const groups = groupLibrarySentences(
    [
      { ...dataset.islands.mixed.sentences[0], sourceType: "island", sourceKey: "mixed" },
      { ...dataset.islands.mixed.sentences[1], sourceType: "island", sourceKey: "mixed" },
    ],
    { ...DEFAULT_PROGRESS, sentences: {} },
    "difficulty",
    dataset
  );
  assert.ok(groups.some((g) => g.key === "mixed"));
  section("library mixed difficulty bucketing");
}

// ── Clone remaps IDs ───────────────────────────────────────────────────────
{
  const source: Island = {
    id: "src-1",
    description: "Shared cafe",
    subtopics: ["order"],
    createdBy: { userId: "owner", displayName: "Owner" },
    sentences: [
      {
        id: "collision-id",
        english: "One coffee",
        register: "polite",
        difficulty: 2,
        category: "cafe",
        subtopic: "order",
        tags: [],
        translated: false,
      },
    ],
  };
  const cloned = cloneIslandForUser({
    source,
    existingIslandKeys: ["shared_cafe"],
    existingSentenceIds: new Set(["collision-id"]),
    shareId: "share-1",
  });
  assert.notEqual(cloned.island.sentences[0].id, "collision-id");
  assert.equal(cloned.island.createdBy?.displayName, "Owner");
  assert.equal(cloned.island.provenance?.kind, "cloned");
  assert.equal(cloned.island.provenance?.clonedFromShareId, "share-1");
  section("clone remaps colliding sentence ids");
}

// ── Narration resolution + validation ──────────────────────────────────────
{
  const { sentences } = resolveIslandSentences(
    [
      {
        id: "nar-001",
        english: "How are you?",
        register: "polite",
        difficulty: 2,
        category: "chat",
        subtopic: "greet",
        tags: [],
        speaker: "A",
        narrationAudio: { pauseAfterMs: 600 },
        paralinguisticTags: ["friendly"],
      },
      {
        id: "nar-002",
        english: "I'm fine, thanks!",
        register: "casual",
        difficulty: 2,
        category: "chat",
        subtopic: "greet",
        tags: [],
        speaker: "B",
        narrationAudio: { pauseAfterMs: 400 },
        paralinguisticTags: ["laughing"],
      },
    ],
    new Map(),
    "chat",
    new Set(),
    { format: "narration", difficultyMode: "matched" }
  );
  assert.equal(sentences.length, 2);
  assert.equal(sentences[0].speaker, "A");
  assert.equal(sentences[1].speaker, "B");
  assert.deepEqual(sentences[0].paralinguisticTags, ["friendly"]);

  const island: Island = {
    description: "Chat",
    subtopics: ["greet"],
    format: "narration",
    speakers: ["A", "B"],
    sentences,
  };
  validateNarrationIsland(island);

  // Standard generation strips inherited narration fields from reused sentences
  const catalog = new Map<string, Sentence>([
    [
      "reuse-1",
      {
        id: "reuse-1",
        english: "Hello",
        register: "polite",
        difficulty: 1,
        category: "g",
        subtopic: "h",
        tags: [],
        translated: true,
        japanese: "こんにちは",
        speaker: "A",
        narrationAudio: { pauseAfterMs: 800 },
      },
    ],
  ]);
  const standard = resolveIslandSentences(
    [{ id: "reuse-1" }],
    catalog,
    "std",
    new Set(["reuse-1"]),
    { format: "standard" }
  );
  assert.equal(standard.sentences[0].speaker, undefined);
  assert.equal(standard.sentences[0].narrationAudio, undefined);
  section("narration generation + standard strip");
}

// ── Prompt branches ────────────────────────────────────────────────────────
{
  const natural = buildIslandGenerationPrompt("sickness", 10, [], {
    difficultyMode: "natural",
    format: "standard",
    durationLabel: "Quick",
  });
  assert.ok(natural.includes("NATURAL / MIXED"));
  assert.ok(natural.includes("null"));
  assert.ok(natural.includes("PARALINGUISTIC TAGS"));

  const narration = buildIslandGenerationPrompt("joke exchange", 22, [], {
    difficultyMode: "matched",
    format: "narration",
    durationLabel: "Standard",
    levelDescription: "Intermediate",
    difficultyRange: [3, 4],
  });
  assert.ok(narration.includes("NARRATION"));
  assert.ok(narration.includes('"speaker": "A" | "B"'));
  assert.ok(narration.includes("lean into that"));
  section("generation prompt branches");
}

console.log("\nAll island sharing/generation checks passed.\n");
