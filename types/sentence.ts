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

export interface TranslatedFields {
  japanese: string;
  reading: string;
  romaji: string;
  literal_note?: string;
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
