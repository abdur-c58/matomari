import type { Scene, Register, Sentence } from "@/types/sentence";
import { validateSceneUniqueness } from "@/lib/validation/dataset-schema";
import { normalizeEnglish } from "@/lib/sentence-utils";
import { MAX_SCENE_SENTENCE_COUNT } from "@/lib/constants/study";

export interface ManualSentenceDraft {
  english: string;
  register: Register;
  context_notes?: string;
}

export function nextManualSentenceId(
  sceneKey: string,
  globalIds: Set<string>,
  localIds: Set<string>,
  startIndex = 1
): string {
  let index = startIndex;
  while (index <= MAX_SCENE_SENTENCE_COUNT) {
    const id = `${sceneKey}-${String(index).padStart(3, "0")}`;
    if (!globalIds.has(id) && !localIds.has(id)) return id;
    index++;
  }
  throw new Error("Could not allocate a sentence id for this scene");
}

export function createManualSentence(
  draft: ManualSentenceDraft,
  sceneKey: string,
  globalIds: Set<string>,
  localIds: Set<string>
): Sentence {
  const english = draft.english.trim();
  if (!english) {
    throw new Error("Sentence cannot be empty");
  }

  const id = nextManualSentenceId(sceneKey, globalIds, localIds);

  return {
    id,
    english,
    register: draft.register,
    difficulty: 3,
    category: sceneKey,
    subtopic: "general",
    tags: [],
    context_notes: draft.context_notes?.trim() || undefined,
    translated: false,
  };
}

export function deriveSceneSubtopics(sentences: Sentence[]): string[] {
  const subtopics = [...new Set(sentences.map((s) => s.subtopic).filter(Boolean))];
  return subtopics.length > 0 ? subtopics : ["general"];
}

export function buildManualScene(
  sceneKey: string,
  name: string,
  description: string | undefined,
  sentences: Sentence[]
): Scene {
  validateSceneUniqueness({ sentences });

  const seenEnglish = new Set<string>();
  for (const sentence of sentences) {
    const norm = normalizeEnglish(sentence.english);
    if (seenEnglish.has(norm)) {
      throw new Error(`Duplicate sentence: "${sentence.english}"`);
    }
    seenEnglish.add(norm);
  }

  return {
    description: description?.trim() || `Personal scene: ${name.trim()}`,
    subtopics: deriveSceneSubtopics(sentences),
    sentences,
  };
}
