import type {
  FishAudioDirectives,
  NarrationPauseMs,
} from "@/lib/audio/fish-audio-cues";
import type { Dialect } from "@/lib/constants/dialect";
import type {
  SceneDifficultyMode,
  SceneDurationTier,
} from "@/lib/constants/scene-generation";

export type Register = "casual" | "polite" | "formal";

/** Dialogue speaker for narration-format scenes. */
export type NarrationSpeaker = "A" | "B";

export type SceneFormat = "standard" | "narration";

/** Per-turn narration delivery — Fish cues compile at TTS time only (not UI text). */
export interface NarrationAudio {
  pauseAfterMs: NarrationPauseMs;
  /**
   * Legacy structured Fish cues from premade catalogs.
   * Prefer sentence.paralinguisticTags for new content.
   */
  fishAudio?: FishAudioDirectives;
}

/**
 * Scene-level delivery direction applied to every narration turn.
 * `toneTags` are free-form Fish instructions and combine with per-line tags.
 */
export interface SceneNarrationMode {
  context: string;
  toneTags: string[];
}

export interface SeedSentence {
  id: string;
  english: string;
  register: Register;
  /**
   * Numeric difficulty 1–5, or null when generated in natural/mixed mode.
   * Null must be bucketed separately from numeric library filters/sorts.
   */
  difficulty: number | null;
  category: string;
  subtopic: string;
  /** Semantic study tags (topics), not Fish speech instructions. */
  tags: string[];
  context_notes?: string;
  translated: boolean;
  /** Speaker turn for narration scenes (A/B). */
  speaker?: NarrationSpeaker;
  /**
   * Free-form Fish Audio natural-language bracket tags compiled at TTS time.
   * e.g. ["laughing"], ["whispering"], ["weak voice"]
   */
  paralinguisticTags?: string[];
  /**
   * Narration scenes only: authored pause + optional legacy Fish cues.
   * Never injected into japanese / reading / romaji display fields.
   */
  narrationAudio?: NarrationAudio;
}

export type PlaceholderResolveAs = "learner" | "literal";

export interface SentencePlaceholder {
  tag: string;
  resolveAs: PlaceholderResolveAs;
  readingSubstitute: string;
  label?: string;
}

export interface TranslatedFields {
  japanese: string;
  reading: string;
  romaji: string;
  literal_note?: string;
  /** Kansai-only: exaggerated kana script for TTS accent simulation via standard voices */
  phonetic_reading?: string;
  placeholders?: SentencePlaceholder[];
}

export type Sentence = SeedSentence & Partial<TranslatedFields>;

export interface PathwayBatch {
  batch_number: number;
  batch_title: string;
  target_difficulty_range: [number, number];
  sentences: Sentence[];
}

export interface SceneCreatedBy {
  userId: string;
  displayName: string;
}

export type SceneProvenanceKind =
  | "owned"
  | "shared"
  | "cloned"
  | "premade"
  | "ai";

export interface SceneProvenance {
  kind: SceneProvenanceKind;
  /** Live share row id when provenance is shared/cloned. */
  shareId?: string;
  /** Stable scene id on the owner's dataset. */
  sourceSceneId?: string;
  /** Owner of the live shared source (membership scenes). */
  ownerUserId?: string;
  clonedFromShareId?: string;
}

export interface Scene {
  description: string;
  subtopics: string[];
  sentences: Sentence[];
  /** Optional display title override (defaults to formatted scene key). */
  title?: string;
  /** Decorative kanji watermark for study UI (1–2 characters). */
  themeKanji?: string;
  /** Highlighted premade scenes (e.g. 300 Essentials) — orange pathway-style chrome. */
  featured?: boolean;
  /** standard = flat list; narration = multi-speaker dialogue. */
  format?: SceneFormat;
  /** Speakers used when format is narration (default A, B). */
  speakers?: NarrationSpeaker[];
  /** Shared contextual delivery direction for every turn in this narration scene. */
  narrationMode?: SceneNarrationMode;
  /**
   * Pro: catalog voice ids (or Fish reference ids) per speaker.
   * When unset, env default A/B pairing is used.
   */
  speakerVoices?: { A?: string; B?: string };
  /** Stable UUID for sharing / reconciliation (assigned on create/share). */
  id?: string;
  /** Creator attribution shown as "Created by {displayName}". */
  createdBy?: SceneCreatedBy;
  /** matched = level-constrained; natural = mixed/null sentence difficulty. */
  difficultyMode?: SceneDifficultyMode;
  /** Approximate generation size tier. */
  durationTier?: SceneDurationTier;
  /** How this scene entered the library. */
  provenance?: SceneProvenance;
  /**
   * Composed membership scenes are read-only (not persisted in user_datasets).
   * Owner edits flow through live share resolution.
   */
  readOnly?: boolean;
}

export interface Dataset {
  main_pathway: {
    description: string;
    batches: PathwayBatch[];
  };
  scenes: Record<string, Scene>;
}

export type SentenceDialectTranslations = Partial<Record<Dialect, TranslatedFields>>;

/** Per-user library stored locally and synced — scenes only; pathway is public. */
export interface UserLibrary {
  scenes: Record<string, Scene>;
  /** User-specific translations keyed by sentence id, then dialect. */
  sentenceTranslations?: Record<string, SentenceDialectTranslations>;
}
