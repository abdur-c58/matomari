import type { Dataset, TranslatedFields, UserLibrary } from "@/types/sentence";
import {
  extractUserLibrary,
  isLegacyFullDataset,
  normalizeStoredLibrary,
  resolveComposedDataset,
} from "@/lib/services/shared-pathway-service";
import {
  applyDialectTranslations,
  collectTranslationsForDialect,
  mergeSentenceTranslations,
  migrateLegacyIslandTranslations,
  seedStandardTranslationsFromDataset,
} from "@/lib/services/dialect-translation-service";
import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";
import { getProgress } from "./progress-repository";
import { getDB } from "./index";

const DATASET_KEY = "main";

export async function getUserLibrary(): Promise<UserLibrary | null> {
  try {
    const db = await getDB();
    const record = await db.get("dataset", DATASET_KEY);
    if (!record?.data) return null;

    const library = normalizeStoredLibrary(record.data);
    if (!library) return null;

    let migrated = library;
    if (isLegacyFullDataset(record.data)) {
      migrated = migrateLegacyIslandTranslations(library);
      await saveUserLibrary(migrated);
    } else {
      const withTranslations = migrateLegacyIslandTranslations(library);
      if (withTranslations.sentenceTranslations !== library.sentenceTranslations) {
        migrated = withTranslations;
        await saveUserLibrary(migrated);
      }
    }

    return migrated;
  } catch {
    return null;
  }
}

export async function saveUserLibrary(data: UserLibrary): Promise<void> {
  const db = await getDB();
  await db.put(
    "dataset",
    {
      id: DATASET_KEY,
      data: data as unknown as Dataset,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    DATASET_KEY
  );
}

export async function getComposedDataset(): Promise<Dataset | null> {
  const [library, progress] = await Promise.all([getUserLibrary(), getProgress()]);
  const base = await resolveComposedDataset(library);
  if (!base) return null;

  let sentenceTranslations = library?.sentenceTranslations ?? {};
  const seeded = seedStandardTranslationsFromDataset(base, sentenceTranslations);
  if (seeded !== sentenceTranslations && library) {
    sentenceTranslations = seeded;
    await saveUserLibrary({ ...library, sentenceTranslations: seeded });
  }

  return applyDialectTranslations(
    base,
    sentenceTranslations,
    progress.settings.dialect ?? DEFAULT_DIALECT
  );
}

/** @deprecated Use getUserLibrary + getComposedDataset */
export async function getDataset(): Promise<Dataset | null> {
  return getComposedDataset();
}

/** Merge translated fields into the library map without cloning the full composed dataset. */
export async function appendSentenceTranslations(
  updates: Record<string, TranslatedFields>,
  dialect: Dialect
): Promise<UserLibrary> {
  const library = (await getUserLibrary()) ?? { islands: {} };
  const batchUpdates: Record<string, Partial<Record<Dialect, TranslatedFields>>> = {};

  for (const [id, fields] of Object.entries(updates)) {
    batchUpdates[id] = { [dialect]: fields };
  }

  const next: UserLibrary = {
    ...library,
    sentenceTranslations: mergeSentenceTranslations(library.sentenceTranslations, batchUpdates),
  };
  await saveUserLibrary(next);
  return next;
}

export async function saveDataset(data: Dataset): Promise<void> {
  const [existing, progress] = await Promise.all([getUserLibrary(), getProgress()]);
  const dialect = progress.settings.dialect ?? DEFAULT_DIALECT;
  const sentenceTranslations = collectTranslationsForDialect(
    data,
    dialect,
    existing?.sentenceTranslations ?? {}
  );
  await saveUserLibrary({
    islands: data.islands,
    sentenceTranslations,
  });
}

export async function exportDataset(): Promise<Dataset | null> {
  return getComposedDataset();
}

export async function hasDataset(): Promise<boolean> {
  return (await getComposedDataset()) !== null;
}

export async function hasUserLibrary(): Promise<boolean> {
  const library = await getUserLibrary();
  return library !== null && Object.keys(library.islands).length > 0;
}
