import type { Island, Register, Sentence } from "@/types/sentence";
import { validateIslandUniqueness } from "@/lib/validation/dataset-schema";
import { normalizeEnglish } from "@/lib/sentence-utils";
import { MAX_ISLAND_SENTENCE_COUNT } from "@/lib/constants/study";

export interface ManualSentenceDraft {
  english: string;
  register: Register;
  context_notes?: string;
}

export function nextManualSentenceId(
  islandKey: string,
  globalIds: Set<string>,
  localIds: Set<string>,
  startIndex = 1
): string {
  let index = startIndex;
  while (index <= MAX_ISLAND_SENTENCE_COUNT) {
    const id = `${islandKey}-${String(index).padStart(3, "0")}`;
    if (!globalIds.has(id) && !localIds.has(id)) return id;
    index++;
  }
  throw new Error("Could not allocate a sentence id for this island");
}

export function createManualSentence(
  draft: ManualSentenceDraft,
  islandKey: string,
  globalIds: Set<string>,
  localIds: Set<string>
): Sentence {
  const english = draft.english.trim();
  if (!english) {
    throw new Error("Sentence cannot be empty");
  }

  const id = nextManualSentenceId(islandKey, globalIds, localIds);

  return {
    id,
    english,
    register: draft.register,
    difficulty: 3,
    category: islandKey,
    subtopic: "general",
    tags: [],
    context_notes: draft.context_notes?.trim() || undefined,
    translated: false,
  };
}

export function deriveIslandSubtopics(sentences: Sentence[]): string[] {
  const subtopics = [...new Set(sentences.map((s) => s.subtopic).filter(Boolean))];
  return subtopics.length > 0 ? subtopics : ["general"];
}

export function buildManualIsland(
  islandKey: string,
  name: string,
  description: string | undefined,
  sentences: Sentence[]
): Island {
  validateIslandUniqueness({ sentences });

  const seenEnglish = new Set<string>();
  for (const sentence of sentences) {
    const norm = normalizeEnglish(sentence.english);
    if (seenEnglish.has(norm)) {
      throw new Error(`Duplicate sentence: "${sentence.english}"`);
    }
    seenEnglish.add(norm);
  }

  return {
    description: description?.trim() || `Personal island: ${name.trim()}`,
    subtopics: deriveIslandSubtopics(sentences),
    sentences,
  };
}
