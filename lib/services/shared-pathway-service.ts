import type { Dataset, UserLibrary } from "@/types/sentence";
import type { PremadeCatalog } from "@/types/premade-catalog";
import { parseDataset } from "@/lib/validation/dataset-schema";
import { getMeta, setMeta } from "@/lib/db/sync-queue-repository";
import { fetchSharedPremadeCatalog } from "@/lib/services/shared-premade-service";

const CACHE_KEY = "sharedPathwayCache";
const CACHE_UPDATED_KEY = "sharedPathwayUpdatedAt";

export type SharedPathwayResult = {
  main_pathway: Dataset["main_pathway"];
  updatedAt: string;
  source: "network" | "cache";
};

export function composeDataset(
  mainPathway: Dataset["main_pathway"],
  library: UserLibrary | null,
  premadeCatalog: PremadeCatalog | null = null
): Dataset {
  return parseDataset({
    main_pathway: mainPathway,
    scenes: {
      ...(premadeCatalog?.scenes ?? {}),
      ...(library?.scenes ?? {}),
    },
  });
}

export function extractUserLibrary(dataset: Dataset): UserLibrary {
  return { scenes: dataset.scenes, sentenceTranslations: undefined };
}

export function normalizeStoredLibrary(raw: unknown): UserLibrary | null {
  if (!raw || typeof raw !== "object") return null;

  if ("main_pathway" in raw) {
    const legacy = raw as Dataset;
    return { scenes: legacy.scenes ?? {} };
  }

  if ("scenes" in raw) {
    const lib = raw as UserLibrary;
    return {
      scenes: lib.scenes ?? {},
      sentenceTranslations: lib.sentenceTranslations,
    };
  }

  return null;
}

export function isLegacyFullDataset(raw: unknown): raw is Dataset {
  return Boolean(raw && typeof raw === "object" && "main_pathway" in raw);
}

async function readPathwayCache(): Promise<SharedPathwayResult | null> {
  const [json, updatedAt] = await Promise.all([
    getMeta(CACHE_KEY),
    getMeta(CACHE_UPDATED_KEY),
  ]);
  if (!json || !updatedAt) return null;

  try {
    const main_pathway = JSON.parse(json) as Dataset["main_pathway"];
    if (!main_pathway?.batches?.length) return null;
    return { main_pathway, updatedAt, source: "cache" };
  } catch {
    return null;
  }
}

async function writePathwayCache(
  main_pathway: Dataset["main_pathway"],
  updatedAt: string
): Promise<void> {
  await setMeta(CACHE_KEY, JSON.stringify(main_pathway));
  await setMeta(CACHE_UPDATED_KEY, updatedAt);
}

export async function fetchSharedMainPathway(options?: {
  force?: boolean;
}): Promise<SharedPathwayResult | null> {
  const cached = await readPathwayCache();
  const since = options?.force ? null : cached?.updatedAt;

  try {
    const url = since
      ? `/api/pathway?since=${encodeURIComponent(since)}`
      : "/api/pathway";

    const res = await fetch(url, { cache: "no-store" });

    if (res.status === 304 && cached) {
      return cached;
    }

    if (!res.ok) {
      return cached;
    }

    const body = (await res.json()) as {
      main_pathway?: Dataset["main_pathway"];
      updatedAt?: string;
    };

    if (!body.main_pathway?.batches?.length || !body.updatedAt) {
      return cached;
    }

    await writePathwayCache(body.main_pathway, body.updatedAt);
    return {
      main_pathway: body.main_pathway,
      updatedAt: body.updatedAt,
      source: "network",
    };
  } catch {
    return cached;
  }
}

export async function resolveComposedDataset(
  library: UserLibrary | null
): Promise<Dataset | null> {
  const [shared, premadeCatalog] = await Promise.all([
    fetchSharedMainPathway(),
    fetchSharedPremadeCatalog(),
  ]);
  if (!shared) return null;
  return composeDataset(shared.main_pathway, library, premadeCatalog);
}
