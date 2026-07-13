import type { SentenceDialectTranslations, UserLibrary } from "@/types/sentence";
import { getUserLibrary, saveUserLibrary } from "@/lib/db/dataset-repository";
import { mergeSentenceTranslations } from "@/lib/services/dialect-translation-service";
import { getMeta, setMeta } from "@/lib/db/sync-queue-repository";

const CACHE_KEY = "sharedTranslationsCache";
const CACHE_UPDATED_KEY = "sharedTranslationsUpdatedAt";

export type SharedTranslationsResult = {
  translations: Record<string, SentenceDialectTranslations>;
  updatedAt: string;
  source: "network" | "cache";
};

async function readCache(): Promise<SharedTranslationsResult | null> {
  const [json, updatedAt] = await Promise.all([
    getMeta(CACHE_KEY),
    getMeta(CACHE_UPDATED_KEY),
  ]);
  if (!json || !updatedAt) return null;

  try {
    const translations = JSON.parse(json) as Record<string, SentenceDialectTranslations>;
    return { translations, updatedAt, source: "cache" };
  } catch {
    return null;
  }
}

async function writeCache(
  translations: Record<string, SentenceDialectTranslations>,
  updatedAt: string
): Promise<void> {
  await setMeta(CACHE_KEY, JSON.stringify(translations));
  await setMeta(CACHE_UPDATED_KEY, updatedAt);
}

function mergeTranslationMaps(
  base: Record<string, SentenceDialectTranslations> | undefined,
  incoming: Record<string, SentenceDialectTranslations>
): Record<string, SentenceDialectTranslations> {
  return mergeSentenceTranslations(base, incoming);
}

export async function fetchSharedTranslations(options?: {
  force?: boolean;
}): Promise<SharedTranslationsResult | null> {
  const cached = await readCache();
  const since = options?.force ? null : cached?.updatedAt;

  try {
    const url = since
      ? `/api/translations?since=${encodeURIComponent(since)}`
      : "/api/translations";

    const res = await fetch(url, { cache: "no-store" });

    if (res.status === 304 && cached) {
      return cached;
    }

    if (!res.ok) {
      return cached;
    }

    const body = (await res.json()) as {
      translations?: Record<string, SentenceDialectTranslations>;
      updatedAt?: string;
    };

    if (!body.translations || !body.updatedAt) {
      return cached;
    }

    const mergedTranslations = since
      ? mergeTranslationMaps(cached?.translations, body.translations)
      : body.translations;

    await writeCache(mergedTranslations, body.updatedAt);
    return {
      translations: mergedTranslations,
      updatedAt: body.updatedAt,
      source: "network",
    };
  } catch {
    return cached;
  }
}

/** Merge canonical shared translations into the local library (matched by sentence id). */
export async function pullSharedTranslationsIntoLibrary(): Promise<boolean> {
  const shared = await fetchSharedTranslations();
  if (!shared || Object.keys(shared.translations).length === 0) {
    return false;
  }

  const library = (await getUserLibrary()) ?? { islands: {} };
  const merged = mergeTranslationMaps(library.sentenceTranslations, shared.translations);

  const before = JSON.stringify(library.sentenceTranslations ?? {});
  const after = JSON.stringify(merged);
  if (before === after) {
    return false;
  }

  await saveUserLibrary({
    ...library,
    sentenceTranslations: merged,
  });
  return true;
}
