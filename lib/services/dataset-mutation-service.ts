import type { Dataset, Sentence } from "@/types/sentence";
import { getAllSentences, validateIslandUniqueness } from "@/lib/validation/dataset-schema";
import { isTranslated, normalizeEnglish } from "@/lib/sentence-utils";

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
  generated: Sentence[],
  catalog: Map<string, Sentence>,
  islandKey: string,
  globalIds: Set<string>
): { sentences: Sentence[]; reusedIds: string[]; newCount: number } {
  const reusedIds: string[] = [];
  const resolved: Sentence[] = [];
  const seenJapanese = new Set<string>();
  const seenEnglish = new Set<string>();
  const seenIds = new Set<string>();
  let newCount = 0;
  let newIndex = 1;

  for (const item of generated) {
    let sentence: Sentence;

    if (item.id && catalog.has(item.id)) {
      sentence = { ...catalog.get(item.id)! };
      if (item.subtopic) sentence = { ...sentence, subtopic: item.subtopic };
      if (item.category) sentence = { ...sentence, category: item.category };
      reusedIds.push(item.id);
    } else if (item.english) {
      let id = item.id;
      if (!id || globalIds.has(id) || seenIds.has(id)) {
        do {
          id = `${islandKey}-${String(newIndex).padStart(3, "0")}`;
          newIndex++;
        } while (globalIds.has(id) || seenIds.has(id));
      }
      sentence = {
        id,
        english: item.english,
        register: item.register,
        difficulty: item.difficulty,
        category: item.category,
        subtopic: item.subtopic,
        tags: item.tags ?? [],
        context_notes: item.context_notes,
        translated: false,
      };
      newCount++;
    } else {
      continue;
    }

    if (isTranslated(sentence) && sentence.japanese) {
      const norm = sentence.japanese.trim().replace(/\s+/g, "");
      if (seenJapanese.has(norm)) {
        throw new Error(`Duplicate japanese within island: ${sentence.japanese}`);
      }
      seenJapanese.add(norm);
    } else {
      const norm = normalizeEnglish(sentence.english);
      if (seenEnglish.has(norm)) {
        throw new Error(`Duplicate english within island: ${sentence.english}`);
      }
      seenEnglish.add(norm);
    }

    if (seenIds.has(sentence.id)) {
      throw new Error(`Duplicate id within island: ${sentence.id}`);
    }

    seenIds.add(sentence.id);
    resolved.push(sentence);
  }

  return { sentences: resolved, reusedIds, newCount };
}

export function addIsland(
  dataset: Dataset,
  islandKey: string,
  island: { description: string; subtopics: string[]; sentences: Sentence[] }
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

export function getGlobalSentenceIds(dataset: Dataset): Set<string> {
  return new Set(getAllSentences(dataset).keys());
}

export function buildFullSentenceCatalog(dataset: Dataset): Sentence[] {
  return Array.from(getAllSentences(dataset).values()).map(
    ({ sourceType: _s, sourceKey: _k, ...sentence }) => sentence
  );
}
