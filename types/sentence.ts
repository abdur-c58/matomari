import type { Dialect } from "@/lib/constants/dialect";

export type Register = "casual" | "polite" | "formal";

export interface SeedSentence {
  id: string;
  english: string;
  register: Register;
  difficulty: number;
  category: string;
  subtopic: string;
  tags: string[];
  context_notes?: string;
  translated: boolean;
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

export interface Island {
  description: string;
  subtopics: string[];
  sentences: Sentence[];
  /** Decorative kanji watermark for study UI (1–2 characters). */
  themeKanji?: string;
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
