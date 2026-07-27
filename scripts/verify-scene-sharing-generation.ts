/**
 * Focused verification for scene sharing + generation changes.
 * Run: npx tsx scripts/verify-scene-sharing-generation.ts
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
  getSceneDurationTier,
  resolveSceneSentenceTarget,
} from "../lib/constants/scene-generation";
import {
  cloneSceneForUser,
} from "../lib/services/scene-sharing-service";
import {
  hashShareToken,
  newShareToken,
  sharedSceneLibraryKey,
  parseSharedSceneLibraryKey,
  ensureSceneId,
  formatCreatedBy,
  systemCreatedBy,
} from "../lib/services/scene-identity-service";
import { resolveSceneSentences } from "../lib/services/dataset-mutation-service";
import { normalizeLegacySentence, isMixedDifficulty } from "../lib/sentence-utils";
import {
  parseDataset,
  validateNarrationScene,
} from "../lib/validation/dataset-schema";
import {
  filterLibrarySentences,
  defaultLibraryFilters,
  groupLibrarySentences,
} from "../lib/services/library-service";
import type { Scene, Sentence } from "../types/sentence";
import { DEFAULT_PROGRESS } from "../lib/db/index";
import { buildSceneGenerationPrompt } from "../lib/ai/prompts";
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
  const key = sharedSceneLibraryKey("abc-uuid");
  assert.equal(key, "shared:abc-uuid");
  assert.equal(parseSharedSceneLibraryKey(key), "abc-uuid");
  assert.equal(parseSharedSceneLibraryKey("owned"), null);
  section("shared scene library keys");
}

// ── Attribution helpers ────────────────────────────────────────────────────
{
  assert.equal(formatCreatedBy({ userId: "1", displayName: "Ada" }), "Created by Ada");
  assert.equal(formatCreatedBy(null), null);
  assert.equal(systemCreatedBy().displayName, "Matomari");
  const scene = ensureSceneId({
    description: "x",
    subtopics: [],
    sentences: [],
  });
  assert.ok(scene.id);
  section("attribution helpers");
}

// ── Duration tiers ─────────────────────────────────────────────────────────
{
  assert.equal(resolveSceneSentenceTarget("quick"), 10);
  assert.equal(resolveSceneSentenceTarget("standard"), 22);
  assert.equal(resolveSceneSentenceTarget("deep"), 45);
  assert.equal(getSceneDurationTier("quick").softMax, 14);
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
    "scene-a-001",
    script,
    "standard",
    "A",
    "spoken-script"
  );
  const second = buildTtsCacheKey(
    "scene-b-099",
    script,
    "standard",
    "A",
    "spoken-script"
  );
  assert.equal(first, second);
  assert.notEqual(
    buildTtsCacheKey("scene-a-001", script),
    buildTtsCacheKey("scene-b-099", script)
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

// ── Schema preserves scene metadata ───────────────────────────────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    scenes: {
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
  const scene = dataset.scenes.cafe;
  assert.equal(scene.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(scene.createdBy?.displayName, "Ada");
  assert.equal(scene.difficultyMode, "natural");
  assert.equal(scene.durationTier, "quick");
  assert.equal(scene.sentences[0].difficulty, null);
  assert.deepEqual(scene.sentences[0].paralinguisticTags, ["soft tone"]);
  section("dataset schema preserves generation metadata");
}

// ── Scene narration mode is applied to every contextual turn ─────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    scenes: {
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
    kind: "scene",
    key: "scene",
  });
  assert.deepEqual(turn.paralinguisticTags, [
    "soft, emotionally restrained conversation",
    "hesitating",
  ]);
  section("scene narration mode applies to turns");
}

// ── Library excludes mixed from numeric filters ────────────────────────────
{
  const dataset = parseDataset({
    main_pathway: { description: "", batches: [] },
    scenes: {
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
      { ...dataset.scenes.mixed.sentences[0], sourceType: "scene", sourceKey: "mixed" },
      { ...dataset.scenes.mixed.sentences[1], sourceType: "scene", sourceKey: "mixed" },
    ],
    DEFAULT_PROGRESS,
    { ...defaultLibraryFilters, difficultyMin: 1, difficultyMax: 3 }
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "n2");

  const groups = groupLibrarySentences(
    [
      { ...dataset.scenes.mixed.sentences[0], sourceType: "scene", sourceKey: "mixed" },
      { ...dataset.scenes.mixed.sentences[1], sourceType: "scene", sourceKey: "mixed" },
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
  const source: Scene = {
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
  const cloned = cloneSceneForUser({
    source,
    existingSceneKeys: ["shared_cafe"],
    existingSentenceIds: new Set(["collision-id"]),
    shareId: "share-1",
  });
  assert.notEqual(cloned.scene.sentences[0].id, "collision-id");
  assert.equal(cloned.scene.createdBy?.displayName, "Owner");
  assert.equal(cloned.scene.provenance?.kind, "cloned");
  assert.equal(cloned.scene.provenance?.clonedFromShareId, "share-1");
  section("clone remaps colliding sentence ids");
}

// ── Narration resolution + validation ──────────────────────────────────────
{
  const { sentences } = resolveSceneSentences(
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

  const scene: Scene = {
    description: "Chat",
    subtopics: ["greet"],
    format: "narration",
    speakers: ["A", "B"],
    sentences,
  };
  validateNarrationScene(scene);

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
  const standard = resolveSceneSentences(
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
  const natural = buildSceneGenerationPrompt("sickness", 10, [], {
    difficultyMode: "natural",
    format: "standard",
    durationLabel: "Quick",
  });
  assert.ok(natural.includes("NATURAL / MIXED"));
  assert.ok(natural.includes("null"));
  assert.ok(natural.includes("PARALINGUISTIC TAGS"));

  const narration = buildSceneGenerationPrompt("joke exchange", 22, [], {
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

console.log("\nAll scene sharing/generation checks passed.\n");
