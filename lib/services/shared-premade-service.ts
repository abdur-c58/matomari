import { getMeta, setMeta } from "@/lib/db/sync-queue-repository";
import { parsePremadeCatalog } from "@/lib/validation/premade-catalog-schema";
import type { Scene } from "@/types/sentence";
import {
  EMPTY_PREMADE_CATALOG,
  type PremadeCatalog,
} from "@/types/premade-catalog";
import {
  isSharedSceneLibraryKey,
  systemCreatedBy,
} from "@/lib/services/scene-identity-service";

const CACHE_KEY = "sharedPremadeCatalogCache";
const CACHE_UPDATED_KEY = "sharedPremadeCatalogUpdatedAt";

export type SharedPremadeResult = PremadeCatalog & {
  source: "network" | "cache";
};

export function getPremadeSceneKeys(catalog: PremadeCatalog | null): Set<string> {
  return new Set(Object.keys(catalog?.scenes ?? {}));
}

export function isPremadeSceneKey(
  key: string,
  catalog: PremadeCatalog | null
): boolean {
  return Boolean(catalog?.scenes[key]);
}

export function isPremadeFolderId(
  folderId: string,
  catalog: PremadeCatalog | null
): boolean {
  return Boolean(catalog?.folders.some((f) => f.id === folderId));
}

export function filterUserScenes(
  scenes: Record<string, Scene>,
  premadeKeys: Set<string>
): Record<string, Scene> {
  const result = { ...scenes };
  for (const key of premadeKeys) {
    delete result[key];
  }
  for (const key of Object.keys(result)) {
    // Live membership scenes are composed at runtime — never persist them.
    if (isSharedSceneLibraryKey(key) || result[key]?.readOnly) {
      delete result[key];
    }
  }
  return result;
}

function withPremadeAttribution(catalog: PremadeCatalog): PremadeCatalog {
  const createdBy = systemCreatedBy();
  const scenes = Object.fromEntries(
    Object.entries(catalog.scenes).map(([key, scene]) => [
      key,
      {
        ...scene,
        createdBy: scene.createdBy ?? createdBy,
        provenance: scene.provenance ?? { kind: "premade" as const },
      },
    ])
  );
  return { ...catalog, scenes };
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
      return withPremadeAttribution(cached);
    }

    if (!res.ok) {
      return withPremadeAttribution(cached ?? EMPTY_PREMADE_CATALOG);
    }

    const body = (await res.json()) as PremadeCatalog;
    if (!body?.updatedAt) {
      return withPremadeAttribution(cached ?? EMPTY_PREMADE_CATALOG);
    }

    const catalog = parsePremadeCatalog(body);
    await writePremadeCache(catalog);
    return withPremadeAttribution(catalog);
  } catch {
    return withPremadeAttribution(cached ?? EMPTY_PREMADE_CATALOG);
  }
}
