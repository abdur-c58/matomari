import { z } from "zod";
import type { Dataset, Scene, PathwayBatch } from "@/types/sentence";
import {
  datasetSchema,
  getAllSentences,
  sceneSchema,
  parseDataset,
  validateSceneUniqueness,
} from "@/lib/validation/dataset-schema";
import { slugifySceneKey } from "@/lib/services/dataset-mutation-service";

const scenesOnlySchema = z.object({
  scenes: z.record(z.string(), sceneSchema),
});

const legacyIslandsOnlySchema = z.object({
  islands: z.record(z.string(), sceneSchema),
});

export class ImportError extends Error {
  constructor(
    message: string,
    readonly fileName?: string
  ) {
    super(fileName ? `${fileName}: ${message}` : message);
    this.name = "ImportError";
  }
}

function sceneKeyFromFileName(fileName?: string): string | null {
  if (!fileName) return null;
  const base = fileName
    .replace(/\.json$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || null;
}

function emptyPathwayDataset(scenes: Record<string, Scene>): Dataset {
  return parseDataset({
    main_pathway: { description: "", batches: [] },
    scenes,
  });
}

/** Accept full datasets, `{ scenes: {...} }`, single scene objects, or `{ key: scene }`. */
export function parseImportPayload(json: unknown, fileName?: string): Dataset {
  if (datasetSchema.safeParse(json).success) {
    return parseDataset(json);
  }

  const scenesOnly = scenesOnlySchema.safeParse(json);
  if (scenesOnly.success) {
    return emptyPathwayDataset(scenesOnly.data.scenes as Record<string, Scene>);
  }

  const legacyIslands = legacyIslandsOnlySchema.safeParse(json);
  if (legacyIslands.success) {
    return emptyPathwayDataset(legacyIslands.data.islands as Record<string, Scene>);
  }

  const singleScene = sceneSchema.safeParse(json);
  if (singleScene.success) {
    const key =
      sceneKeyFromFileName(fileName) ?? slugifySceneKey("scene", []);
    return emptyPathwayDataset({ [key]: singleScene.data as Scene });
  }

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const entries = Object.entries(json as Record<string, unknown>);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      const scene = sceneSchema.safeParse(value);
      if (scene.success) {
        return emptyPathwayDataset({ [key]: scene.data as Scene });
      }
    }
  }

  throw new ImportError(
    "Unrecognized JSON format — expected a dataset or scene export",
    fileName
  );
}

function mergeBatchSentences(existing: PathwayBatch, incoming: PathwayBatch): PathwayBatch {
  const seen = new Set(existing.sentences.map((s) => s.id));
  const mergedSentences = [...existing.sentences];

  for (const sentence of incoming.sentences) {
    if (seen.has(sentence.id)) {
      throw new ImportError(
        `Duplicate sentence id "${sentence.id}" in batch ${existing.batch_number}`
      );
    }
    seen.add(sentence.id);
    mergedSentences.push(sentence);
  }

  return {
    ...existing,
    batch_title: existing.batch_title || incoming.batch_title,
    target_difficulty_range: incoming.target_difficulty_range ?? existing.target_difficulty_range,
    sentences: mergedSentences,
  };
}

function assertNoGlobalIdCollisions(base: Dataset, incoming: Dataset, fileName?: string): void {
  const baseIds = getAllSentences(base);
  for (const id of getAllSentences(incoming).keys()) {
    if (baseIds.has(id)) {
      throw new ImportError(`Sentence id "${id}" already exists in your library`, fileName);
    }
  }
}

export function mergeDatasets(base: Dataset, incoming: Dataset, fileName?: string): Dataset {
  assertNoGlobalIdCollisions(base, incoming, fileName);

  const mergedScenes: Record<string, Scene> = { ...base.scenes };
  const sceneKeys = Object.keys(mergedScenes);

  for (const [rawKey, scene] of Object.entries(incoming.scenes)) {
    validateSceneUniqueness(scene);
    const key = mergedScenes[rawKey]
      ? slugifySceneKey(rawKey, sceneKeys)
      : rawKey;
    mergedScenes[key] = scene;
    sceneKeys.push(key);
  }

  const batchByNumber = new Map(base.main_pathway.batches.map((b) => [b.batch_number, b]));
  const mergedBatches = [...base.main_pathway.batches];

  for (const batch of incoming.main_pathway.batches) {
    const existing = batchByNumber.get(batch.batch_number);
    if (existing) {
      const merged = mergeBatchSentences(existing, batch);
      batchByNumber.set(batch.batch_number, merged);
      const idx = mergedBatches.findIndex((b) => b.batch_number === batch.batch_number);
      if (idx >= 0) mergedBatches[idx] = merged;
    } else {
      mergedBatches.push(batch);
      batchByNumber.set(batch.batch_number, batch);
    }
  }

  mergedBatches.sort((a, b) => a.batch_number - b.batch_number);

  return parseDataset({
    main_pathway: {
      description: base.main_pathway.description || incoming.main_pathway.description,
      batches: mergedBatches,
    },
    scenes: mergedScenes,
  });
}

export function combineImportPayloads(
  payloads: { json: unknown; fileName?: string }[],
  existing: Dataset | null
): Dataset {
  if (payloads.length === 0) {
    throw new ImportError("No files to import");
  }

  let result = existing;

  for (const payload of payloads) {
    const incoming = parseImportPayload(payload.json, payload.fileName);
    result = result ? mergeDatasets(result, incoming, payload.fileName) : incoming;
  }

  return result!;
}

export function isSceneOnlyImport(dataset: Dataset): boolean {
  return (
    dataset.main_pathway.batches.length === 0 && Object.keys(dataset.scenes).length > 0
  );
}

/** Single or multi-file import — main pathway is public; imports add scenes only. */
export function resolveImportDataset(
  payloads: { json: unknown; fileName?: string }[],
  existing: Dataset | null
): Dataset {
  if (payloads.length === 0) {
    throw new ImportError("No files to import");
  }

  const baseScenes = existing?.scenes ?? {};

  if (payloads.length > 1) {
    let mergedScenes = { ...baseScenes };
    for (const payload of payloads) {
      const incoming = parseImportPayload(payload.json, payload.fileName);
      const next = mergeDatasets(
        emptyPathwayDataset(mergedScenes),
        emptyPathwayDataset(incoming.scenes),
        payload.fileName
      );
      mergedScenes = next.scenes;
    }
    return emptyPathwayDataset(mergedScenes);
  }

  const incoming = parseImportPayload(payloads[0].json, payloads[0].fileName);

  if (existing) {
    return mergeDatasets(existing, emptyPathwayDataset(incoming.scenes), payloads[0].fileName);
  }

  return emptyPathwayDataset(incoming.scenes);
}

export function summarizeDataset(dataset: Dataset) {
  return {
    batchCount: dataset.main_pathway.batches.length,
    sceneCount: Object.keys(dataset.scenes).length,
    sentenceCount: getAllSentences(dataset).size,
  };
}
