import type { IslandNarrationMode, Sentence } from "@/types/sentence";

export type TutorContext =
  | { type: "general" }
  | { type: "sentence"; sentenceId: string }
  | { type: "island"; islandKey: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SentenceCatalogEntry {
  id: string;
  english: string;
  difficulty: number | null;
  category: string;
  register: string;
  subtopic: string;
  japanese?: string;
  reading?: string;
  romaji?: string;
  tags?: string[];
  context_notes?: string;
  translated?: boolean;
}

export interface DatasetSummary {
  islandKeys: string[];
  sentenceCount: number;
  sentenceCatalog: SentenceCatalogEntry[];
  focusSentence?: SentenceCatalogEntry & {
    tags: string[];
    literal_note?: string;
    rating?: number | null;
    meaningConfirmed?: boolean;
  };
  focusIsland?: {
    key: string;
    description: string;
    subtopics: string[];
    sentences: SentenceCatalogEntry[];
  };
}

export interface IslandGenerationPreview {
  islandKey: string;
  description: string;
  subtopics: string[];
  sentences: Sentence[];
  reusedIds: string[];
  newCount: number;
  format?: "standard" | "narration";
  speakers?: Array<"A" | "B">;
  narrationMode?: IslandNarrationMode;
  difficultyMode?: "matched" | "natural";
  durationTier?: "quick" | "standard" | "deep";
  skippedCount?: number;
}

export interface IslandSuggestion {
  theme: string;
  reason: string;
}

export interface SentenceReviewResult {
  correctedEnglish: string;
  grammarNotes: string[];
  toneQuestions: string[];
  suggestedRegister: "casual" | "polite" | "formal";
  suggestedContextNotes?: string;
  hasIssues: boolean;
}

export interface TranscriptSentenceSuggestion {
  japanese: string;
  english: string;
  reading: string;
  romaji?: string;
  register: "casual" | "polite" | "formal";
  context_notes?: string;
  reason: string;
}

export interface TranscriptSegmentResult {
  suggestedName: string;
  description: string;
  sentences: TranscriptSentenceSuggestion[];
}
