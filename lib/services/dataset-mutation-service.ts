import type { Dataset, Scene, Sentence } from "@/types/sentence";
import type { z } from "zod";
import type { generatedSceneSentenceSchema } from "@/lib/ai/schemas";
import {
  getAllSentences,
  validateSceneUniqueness,
  validateNarrationScene,
} from "@/lib/validation/dataset-schema";
import { isTranslated, normalizeEnglish } from "@/lib/sentence-utils";
import {
  clampNarrationPauseMs,
  sanitizeParalinguisticTags,
} from "@/lib/audio/fish-audio-cues";

type GeneratedSceneSentence = z.infer<typeof generatedSceneSentenceSchema>;

export { validateSceneUniqueness, validateNarrationScene };

export function slugifySceneKey(theme: string, existingKeys: string[] = []): string {
  const base = theme
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "scene";

  if (!existingKeys.includes(base)) return base;

  let i = 2;
  while (existingKeys.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function stripNarrationFields(sentence: Sentence): Sentence {
  const next = { ...sentence };
  delete next.speaker;
  delete next.narrationAudio;
  return next;
}

export function resolveSceneSentences(
  generated: GeneratedSceneSentence[],
  catalog: Map<string, Sentence>,
  sceneKey: string,
  globalIds: Set<string>,
  options?: {
    format?: "standard" | "narration";
    difficultyMode?: "matched" | "natural";
  }
): { sentences: Sentence[]; reusedIds: string[]; newCount: number; skippedCount: number } {
  const format = options?.format ?? "standard";
  const natural = options?.difficultyMode === "natural";
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
      if (format === "standard") {
        sentence = stripNarrationFields(sentence);
      } else {
        if (item.speaker === "A" || item.speaker === "B") {
          sentence = { ...sentence, speaker: item.speaker };
        }
        if (item.narrationAudio?.pauseAfterMs != null) {
          sentence = {
            ...sentence,
            narrationAudio: {
              pauseAfterMs: clampNarrationPauseMs(item.narrationAudio.pauseAfterMs),
            },
          };
        }
        const tags =
          sanitizeParalinguisticTags(item.paralinguisticTags) ??
          sanitizeParalinguisticTags(item.narrationAudio?.paralinguisticTags);
        if (tags) sentence = { ...sentence, paralinguisticTags: tags };
      }
      if (item.subtopic) sentence = { ...sentence, subtopic: item.subtopic };
      if (item.category) sentence = { ...sentence, category: item.category };
      reusedIds.push(item.id);
    } else if (item.english?.trim()) {
      const difficulty =
        natural || item.difficulty === null
          ? null
          : item.difficulty === undefined
            ? undefined
            : item.difficulty;

      if (
        item.register === undefined ||
        difficulty === undefined ||
        !item.category?.trim() ||
        !item.subtopic?.trim()
      ) {
        skippedCount++;
        continue;
      }

      if (format === "narration") {
        if (item.speaker !== "A" && item.speaker !== "B") {
          skippedCount++;
          continue;
        }
        if (item.narrationAudio?.pauseAfterMs == null) {
          skippedCount++;
          continue;
        }
      }

      let id = item.id;
      if (!id || globalIds.has(id) || seenIds.has(id)) {
        do {
          id = `${sceneKey}-${String(newIndex).padStart(3, "0")}`;
          newIndex++;
        } while (globalIds.has(id) || seenIds.has(id));
      }

      const paralinguisticTags =
        sanitizeParalinguisticTags(item.paralinguisticTags) ??
        sanitizeParalinguisticTags(item.narrationAudio?.paralinguisticTags);

      sentence = {
        id,
        english: item.english.trim(),
        register: item.register,
        difficulty: natural ? null : difficulty,
        category: item.category,
        subtopic: item.subtopic,
        tags: item.tags ?? [],
        context_notes: item.context_notes,
        translated: false,
        ...(paralinguisticTags ? { paralinguisticTags } : {}),
      };

      if (format === "narration") {
        sentence.speaker = item.speaker;
        sentence.narrationAudio = {
          pauseAfterMs: clampNarrationPauseMs(item.narrationAudio!.pauseAfterMs),
        };
      }

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
    throw new Error("Scene generation produced no valid sentences. Try again.");
  }

  return { sentences: resolved, reusedIds, newCount, skippedCount };
}

export function addScene(
  dataset: Dataset,
  sceneKey: string,
  scene: Scene
): Dataset {
  validateSceneUniqueness(scene);
  if (scene.format === "narration") {
    validateNarrationScene(scene);
  }

  if (dataset.scenes[sceneKey]) {
    throw new Error(`Scene "${sceneKey}" already exists`);
  }

  return {
    ...dataset,
    scenes: {
      ...dataset.scenes,
      [sceneKey]: scene,
    },
  };
}

export function appendSentenceToScene(
  dataset: Dataset,
  sceneKey: string,
  sentence: Sentence
): Dataset {
  const scene = dataset.scenes[sceneKey];
  if (!scene) {
    throw new Error(`Scene "${sceneKey}" not found`);
  }
  if (scene.readOnly) {
    throw new Error("Shared scenes are read-only — clone to edit");
  }

  const nextScene = {
    ...scene,
    subtopics: scene.subtopics.includes(sentence.subtopic)
      ? scene.subtopics
      : [...scene.subtopics, sentence.subtopic],
    sentences: [...scene.sentences, sentence],
  };

  validateSceneUniqueness(nextScene);
  if (nextScene.format === "narration") {
    validateNarrationScene(nextScene);
  }

  return {
    ...dataset,
    scenes: {
      ...dataset.scenes,
      [sceneKey]: nextScene,
    },
  };
}

export function setSceneThemeKanji(
  dataset: Dataset,
  sceneKey: string,
  themeKanji: string
): Dataset {
  const scene = dataset.scenes[sceneKey];
  if (!scene) return dataset;
  return {
    ...dataset,
    scenes: {
      ...dataset.scenes,
      [sceneKey]: { ...scene, themeKanji },
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
