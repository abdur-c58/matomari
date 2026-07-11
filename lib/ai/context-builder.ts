import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { isTranslated } from "@/lib/sentence-utils";
import type { DatasetSummary, SentenceCatalogEntry, TutorContext } from "./types";

export function buildSentenceCatalog(dataset: Dataset): SentenceCatalogEntry[] {
  return Array.from(getAllSentences(dataset).values()).map((s) => ({
    id: s.id,
    english: s.english,
    difficulty: s.difficulty,
    category: s.category,
    register: s.register,
    subtopic: s.subtopic,
    japanese: s.japanese,
    reading: s.reading,
    romaji: s.romaji,
    tags: s.tags,
    context_notes: s.context_notes,
    translated: isTranslated(s),
  }));
}

export function buildDatasetSummary(
  dataset: Dataset,
  context: TutorContext,
  progress?: UserProgress
): DatasetSummary {
  const catalog = buildSentenceCatalog(dataset);
  const all = getAllSentences(dataset);

  const summary: DatasetSummary = {
    islandKeys: Object.keys(dataset.islands),
    sentenceCount: catalog.length,
    sentenceCatalog: catalog,
  };

  if (context.type === "sentence") {
    const s = all.get(context.sentenceId);
    if (s) {
      const sp = progress?.sentences[s.id];
      summary.focusSentence = {
        id: s.id,
        english: s.english,
        difficulty: s.difficulty,
        category: s.category,
        register: s.register,
        subtopic: s.subtopic,
        tags: s.tags,
        context_notes: s.context_notes,
        japanese: s.japanese,
        reading: s.reading,
        romaji: s.romaji,
        literal_note: s.literal_note,
        translated: isTranslated(s),
        rating: sp?.rating ?? null,
        meaningConfirmed: sp?.meaningConfirmed,
      };
    }
  }

  if (context.type === "island") {
    const island = dataset.islands[context.islandKey];
    if (island) {
      summary.focusIsland = {
        key: context.islandKey,
        description: island.description,
        subtopics: island.subtopics,
        sentences: island.sentences.map((s) => ({
          id: s.id,
          english: s.english,
          difficulty: s.difficulty,
          category: s.category,
          register: s.register,
          subtopic: s.subtopic,
          japanese: s.japanese,
          translated: isTranslated(s),
        })),
      };
    }
  }

  return summary;
}

export function getContextLabel(
  context: TutorContext,
  dataset: Dataset | null
): string {
  if (context.type === "general") return "General";
  if (context.type === "sentence" && dataset) {
    const s = getAllSentences(dataset).get(context.sentenceId);
    return s ? s.english.slice(0, 50) : "Sentence";
  }
  if (context.type === "island") {
    return context.islandKey.replace(/_/g, " ");
  }
  return "Tutor";
}
