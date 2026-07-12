import type { Register, Sentence } from "@/types/sentence";
import {
  createManualSentence,
  type ManualSentenceDraft,
} from "@/lib/services/manual-island-service";

export interface TranscriptSentenceDraft extends ManualSentenceDraft {
  japanese?: string;
  reading?: string;
  romaji?: string;
  reason?: string;
}

export function createTranscriptSentence(
  draft: TranscriptSentenceDraft,
  islandKey: string,
  globalIds: Set<string>,
  localIds: Set<string>
): Sentence {
  const base = createManualSentence(
    {
      english: draft.english,
      register: draft.register,
      context_notes: draft.context_notes,
    },
    islandKey,
    globalIds,
    localIds
  );

  const japanese = draft.japanese?.trim();
  if (!japanese) return base;

  return {
    ...base,
    japanese,
    reading: draft.reading?.trim() || japanese,
    romaji: draft.romaji?.trim() || "",
    translated: true,
  };
}

export function transcriptSuggestionToDraft(
  suggestion: {
    japanese: string;
    english: string;
    reading: string;
    romaji?: string;
    register: Register;
    context_notes?: string;
    reason: string;
  }
): TranscriptSentenceDraft {
  return {
    japanese: suggestion.japanese,
    english: suggestion.english,
    reading: suggestion.reading,
    romaji: suggestion.romaji,
    register: suggestion.register,
    context_notes: suggestion.context_notes,
    reason: suggestion.reason,
  };
}

export function draftsToSentences(
  drafts: TranscriptSentenceDraft[],
  islandKey: string,
  globalIds: Set<string>
): Sentence[] {
  const localIds = new Set<string>();
  return drafts.map((draft) => {
    const sentence = createTranscriptSentence(draft, islandKey, globalIds, localIds);
    localIds.add(sentence.id);
    return sentence;
  });
}
