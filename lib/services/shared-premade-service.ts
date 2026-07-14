import { getMeta, setMeta } from "@/lib/db/sync-queue-repository";
import { parsePremadeCatalog } from "@/lib/validation/premade-catalog-schema";
import type { Island } from "@/types/sentence";
import {
  EMPTY_PREMADE_CATALOG,
  type PremadeCatalog,
} from "@/types/premade-catalog";

const CACHE_KEY = "sharedPremadeCatalogCache";
const CACHE_UPDATED_KEY = "sharedPremadeCatalogUpdatedAt";

export type SharedPremadeResult = PremadeCatalog & {
  source: "network" | "cache";
};

export function getPremadeIslandKeys(catalog: PremadeCatalog | null): Set<string> {
  return new Set(Object.keys(catalog?.islands ?? {}));
}

export function isPremadeIslandKey(
  key: string,
  catalog: PremadeCatalog | null
): boolean {
  return Boolean(catalog?.islands[key]);
}

export function isPremadeFolderId(
  folderId: string,
  catalog: PremadeCatalog | null
): boolean {
  return Boolean(catalog?.folders.some((f) => f.id === folderId));
}

export function filterUserIslands(
  islands: Record<string, Island>,
  premadeKeys: Set<string>
): Record<string, Island> {
  if (premadeKeys.size === 0) return islands;
  const result = { ...islands };
  for (const key of premadeKeys) {
    delete result[key];
  }
  return result;
}

async function readPremadeCache(): Promise<SharedPremadeResult | null> {
  const [json, updatedAt] = await Promise.all([
    getMeta(CACHE_KEY),
    getMeta(CACHE_UPDATED_KEY),
  ]);
  if (!json || !updatedAt) return null;

  try {
    const catalog = parsePremadeCatalog(JSON.parse(json));
    return { ...catalog, updatedAt, source: "cache" };
  } catch {
    return null;
  }
}

async function writePremadeCache(catalog: PremadeCatalog): Promise<void> {
  const { updatedAt, ...rest } = catalog;
  await setMeta(CACHE_KEY, JSON.stringify(rest));
  await setMeta(CACHE_UPDATED_KEY, updatedAt);
}

export async function fetchSharedPremadeCatalog(options?: {
  force?: boolean;
}): Promise<PremadeCatalog> {
  const cached = await readPremadeCache();
  const since = options?.force ? null : cached?.updatedAt;

  try {
    const url = since
      ? `/api/premade-catalog?since=${encodeURIComponent(since)}`
      : "/api/premade-catalog";

    const res = await fetch(url, { cache: "no-store" });

    if (res.status === 304 && cached) {
      return cached;
    }

    if (!res.ok) {
      return cached ?? EMPTY_PREMADE_CATALOG;
    }

    const body = (await res.json()) as PremadeCatalog;
    if (!body?.updatedAt) {
      return cached ?? EMPTY_PREMADE_CATALOG;
    }

    const catalog = parsePremadeCatalog(body);
    await writePremadeCache(catalog);
    return catalog;
  } catch {
    return cached ?? EMPTY_PREMADE_CATALOG;
  }
}
