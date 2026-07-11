import { z } from "zod";
import type { Dataset, Island, PathwayBatch } from "@/types/sentence";
import {
  datasetSchema,
  getAllSentences,
  islandSchema,
  parseDataset,
  validateIslandUniqueness,
} from "@/lib/validation/dataset-schema";
import { slugifyIslandKey } from "@/lib/services/dataset-mutation-service";

const islandsOnlySchema = z.object({
  islands: z.record(z.string(), islandSchema),
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

function islandKeyFromFileName(fileName?: string): string | null {
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

function emptyPathwayDataset(islands: Record<string, Island>): Dataset {
  return parseDataset({
    main_pathway: { description: "", batches: [] },
    islands,
  });
}

/** Accept full datasets, `{ islands: {...} }`, single island objects, or `{ key: island }`. */
export function parseImportPayload(json: unknown, fileName?: string): Dataset {
  if (datasetSchema.safeParse(json).success) {
    return parseDataset(json);
  }

  const islandsOnly = islandsOnlySchema.safeParse(json);
  if (islandsOnly.success) {
    return emptyPathwayDataset(islandsOnly.data.islands as Record<string, Island>);
  }

  const singleIsland = islandSchema.safeParse(json);
  if (singleIsland.success) {
    const key =
      islandKeyFromFileName(fileName) ?? slugifyIslandKey("island", []);
    return emptyPathwayDataset({ [key]: singleIsland.data as Island });
  }

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const entries = Object.entries(json as Record<string, unknown>);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      const island = islandSchema.safeParse(value);
      if (island.success) {
        return emptyPathwayDataset({ [key]: island.data as Island });
      }
    }
  }

  throw new ImportError(
    "Unrecognized JSON format — expected a dataset or island export",
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

  const mergedIslands: Record<string, Island> = { ...base.islands };
  const islandKeys = Object.keys(mergedIslands);

  for (const [rawKey, island] of Object.entries(incoming.islands)) {
    validateIslandUniqueness(island);
    const key = mergedIslands[rawKey]
      ? slugifyIslandKey(rawKey, islandKeys)
      : rawKey;
    mergedIslands[key] = island;
    islandKeys.push(key);
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
    islands: mergedIslands,
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

export function isIslandOnlyImport(dataset: Dataset): boolean {
  return (
    dataset.main_pathway.batches.length === 0 && Object.keys(dataset.islands).length > 0
  );
}

/** Single or multi-file import — main pathway is public; imports add islands only. */
export function resolveImportDataset(
  payloads: { json: unknown; fileName?: string }[],
  existing: Dataset | null
): Dataset {
  if (payloads.length === 0) {
    throw new ImportError("No files to import");
  }

  const baseIslands = existing?.islands ?? {};

  if (payloads.length > 1) {
    let mergedIslands = { ...baseIslands };
    for (const payload of payloads) {
      const incoming = parseImportPayload(payload.json, payload.fileName);
      const next = mergeDatasets(
        emptyPathwayDataset(mergedIslands),
        emptyPathwayDataset(incoming.islands),
        payload.fileName
      );
      mergedIslands = next.islands;
    }
    return emptyPathwayDataset(mergedIslands);
  }

  const incoming = parseImportPayload(payloads[0].json, payloads[0].fileName);

  if (existing) {
    return mergeDatasets(existing, emptyPathwayDataset(incoming.islands), payloads[0].fileName);
  }

  return emptyPathwayDataset(incoming.islands);
}

export function summarizeDataset(dataset: Dataset) {
  return {
    batchCount: dataset.main_pathway.batches.length,
    islandCount: Object.keys(dataset.islands).length,
    sentenceCount: getAllSentences(dataset).size,
  };
}
