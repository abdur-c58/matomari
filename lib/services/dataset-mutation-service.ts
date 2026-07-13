import type { Dataset, Sentence } from "@/types/sentence";
import type { z } from "zod";
import type { generatedIslandSentenceSchema } from "@/lib/ai/schemas";
import { getAllSentences, validateIslandUniqueness } from "@/lib/validation/dataset-schema";
import { isTranslated, normalizeEnglish } from "@/lib/sentence-utils";

type GeneratedIslandSentence = z.infer<typeof generatedIslandSentenceSchema>;

export { validateIslandUniqueness };

export function slugifyIslandKey(theme: string, existingKeys: string[] = []): string {
  const base = theme
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "island";

  if (!existingKeys.includes(base)) return base;

  let i = 2;
  while (existingKeys.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function resolveIslandSentences(
  generated: GeneratedIslandSentence[],
  catalog: Map<string, Sentence>,
  islandKey: string,
  globalIds: Set<string>
): { sentences: Sentence[]; reusedIds: string[]; newCount: number; skippedCount: number } {
  const reusedIds: string[] = [];
  const resolved: Sentence[] = [];
  const seenJapanese = new Set<string>();
  const seenEnglish = new Set<string>();
  const seenIds = new Set<string>();
  let newCount = 0;
  let skippedCount = 0;
  let newIndex = 1;

  const tryAdd = (sentence: Sentence): boolean => {
    if (isTranslated(sentence) && sentence.japanese) {
      const norm = sentence.japanese.trim().replace(/\s+/g, "");
      if (seenJapanese.has(norm)) {
        return false;
      }
      seenJapanese.add(norm);
    } else {
      const norm = normalizeEnglish(sentence.english);
      if (seenEnglish.has(norm)) {
        return false;
      }
      seenEnglish.add(norm);
    }

    if (seenIds.has(sentence.id)) {
      return false;
    }

    seenIds.add(sentence.id);
    resolved.push(sentence);
    return true;
  };

  for (const item of generated) {
    let sentence: Sentence | null = null;

    if (item.id && catalog.has(item.id)) {
      sentence = { ...catalog.get(item.id)! };
      if (item.subtopic) sentence = { ...sentence, subtopic: item.subtopic };
      if (item.category) sentence = { ...sentence, category: item.category };
      reusedIds.push(item.id);
    } else if (item.english?.trim()) {
      if (
        item.register === undefined ||
        item.difficulty === undefined ||
        !item.category?.trim() ||
        !item.subtopic?.trim()
      ) {
        skippedCount++;
        continue;
      }

      let id = item.id;
      if (!id || globalIds.has(id) || seenIds.has(id)) {
        do {
          id = `${islandKey}-${String(newIndex).padStart(3, "0")}`;
          newIndex++;
        } while (globalIds.has(id) || seenIds.has(id));
      }
      sentence = {
        id,
        english: item.english.trim(),
        register: item.register,
        difficulty: item.difficulty,
        category: item.category,
        subtopic: item.subtopic,
        tags: item.tags ?? [],
        context_notes: item.context_notes,
        translated: false,
      };
      newCount++;
    } else if (item.id) {
      skippedCount++;
      continue;
    } else {
      skippedCount++;
      continue;
    }

    if (!tryAdd(sentence)) {
      skippedCount++;
    }
  }

  if (resolved.length === 0) {
    throw new Error("Island generation produced no valid sentences. Try again.");
  }

  return { sentences: resolved, reusedIds, newCount, skippedCount };
}

export function addIsland(
  dataset: Dataset,
  islandKey: string,
  island: {
    description: string;
    subtopics: string[];
    sentences: Sentence[];
    themeKanji?: string;
  }
): Dataset {
  validateIslandUniqueness(island);

  if (dataset.islands[islandKey]) {
    throw new Error(`Island "${islandKey}" already exists`);
  }

  return {
    ...dataset,
    islands: {
      ...dataset.islands,
      [islandKey]: island,
    },
  };
}

export function appendSentenceToIsland(
  dataset: Dataset,
  islandKey: string,
  sentence: Sentence
): Dataset {
  const island = dataset.islands[islandKey];
  if (!island) {
    throw new Error(`Island "${islandKey}" not found`);
  }

  const nextIsland = {
    ...island,
    subtopics: island.subtopics.includes(sentence.subtopic)
      ? island.subtopics
      : [...island.subtopics, sentence.subtopic],
    sentences: [...island.sentences, sentence],
  };

  validateIslandUniqueness(nextIsland);

  return {
    ...dataset,
    islands: {
      ...dataset.islands,
      [islandKey]: nextIsland,
    },
  };
}

export function setIslandThemeKanji(
  dataset: Dataset,
  islandKey: string,
  themeKanji: string
): Dataset {
  const island = dataset.islands[islandKey];
  if (!island) return dataset;
  return {
    ...dataset,
    islands: {
      ...dataset.islands,
      [islandKey]: { ...island, themeKanji },
    },
  };
}

export function getGlobalSentenceIds(dataset: Dataset): Set<string> {
  return new Set(getAllSentences(dataset).keys());
}

export function buildFullSentenceCatalog(dataset: Dataset): Sentence[] {
  return Array.from(getAllSentences(dataset).values()).map(
    ({ sourceType: _s, sourceKey: _k, ...sentence }) => sentence
  );
}
