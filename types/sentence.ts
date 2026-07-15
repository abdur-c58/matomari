import type {
  FishAudioDirectives,
  NarrationPauseMs,
} from "@/lib/audio/fish-audio-cues";
import type { Dialect } from "@/lib/constants/dialect";
import type {
  IslandDifficultyMode,
  IslandDurationTier,
} from "@/lib/constants/island-generation";

export type Register = "casual" | "polite" | "formal";

/** Dialogue speaker for narration-format islands. */
export type NarrationSpeaker = "A" | "B";

export type IslandFormat = "standard" | "narration";

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
 * Island-level delivery direction applied to every narration turn.
 * `toneTags` are free-form Fish instructions and combine with per-line tags.
 */
export interface IslandNarrationMode {
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
  /** Speaker turn for narration islands (A/B). */
  speaker?: NarrationSpeaker;
  /**
   * Free-form Fish Audio natural-language bracket tags compiled at TTS time.
   * e.g. ["laughing"], ["whispers sweetly"], ["coughing, embarrassed"]
   */
  paralinguisticTags?: string[];
  /**
   * Narration islands only: authored pause + optional legacy Fish cues.
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

export interface IslandCreatedBy {
  userId: string;
  displayName: string;
}

export type IslandProvenanceKind =
  | "owned"
  | "shared"
  | "cloned"
  | "premade"
  | "ai";

export interface IslandProvenance {
  kind: IslandProvenanceKind;
  /** Live share row id when provenance is shared/cloned. */
  shareId?: string;
  /** Stable island id on the owner's dataset. */
  sourceIslandId?: string;
  /** Owner of the live shared source (membership islands). */
  ownerUserId?: string;
  clonedFromShareId?: string;
}

export interface Island {
  description: string;
  subtopics: string[];
  sentences: Sentence[];
  /** Optional display title override (defaults to formatted island key). */
  title?: string;
  /** Decorative kanji watermark for study UI (1–2 characters). */
  themeKanji?: string;
  /** Highlighted premade islands (e.g. 300 Essentials) — orange pathway-style chrome. */
  featured?: boolean;
  /** standard = flat list; narration = multi-speaker dialogue. */
  format?: IslandFormat;
  /** Speakers used when format is narration (default A, B). */
  speakers?: NarrationSpeaker[];
  /** Shared contextual delivery direction for every turn in this narration island. */
  narrationMode?: IslandNarrationMode;
  /** Stable UUID for sharing / reconciliation (assigned on create/share). */
  id?: string;
  /** Creator attribution shown as "Created by {displayName}". */
  createdBy?: IslandCreatedBy;
  /** matched = level-constrained; natural = mixed/null sentence difficulty. */
  difficultyMode?: IslandDifficultyMode;
  /** Approximate generation size tier. */
  durationTier?: IslandDurationTier;
  /** How this island entered the library. */
  provenance?: IslandProvenance;
  /**
   * Composed membership islands are read-only (not persisted in user_datasets).
   * Owner edits flow through live share resolution.
   */
  readOnly?: boolean;
}

export interface Dataset {
  main_pathway: {
    description: string;
    batches: PathwayBatch[];
  };
  islands: Record<string, Island>;
}

export type SentenceDialectTranslations = Partial<Record<Dialect, TranslatedFields>>;

/** Per-user library stored locally and synced — islands only; pathway is public. */
export interface UserLibrary {
  islands: Record<string, Island>;
  /** User-specific translations keyed by sentence id, then dialect. */
  sentenceTranslations?: Record<string, SentenceDialectTranslations>;
}
