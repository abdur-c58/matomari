import type { Island, SentenceDialectTranslations } from "@/types/sentence";

export async function fetchResolvedSharedIslands(): Promise<{
  islands: Record<string, Island>;
  translations: Record<string, SentenceDialectTranslations>;
}> {
  try {
    const res = await fetch("/api/islands/shared", { cache: "no-store" });
    if (!res.ok) {
      return { islands: {}, translations: {} };
    }
    return (await res.json()) as {
      islands: Record<string, Island>;
      translations: Record<string, SentenceDialectTranslations>;
    };
  } catch {
    return { islands: {}, translations: {} };
  }
}

export function mergeSharedIslandsIntoDataset(
  dataset: {
    main_pathway: unknown;
    islands: Record<string, Island>;
  } | null,
  sharedIslands: Record<string, Island>
) {
  if (!dataset) return dataset;
  if (Object.keys(sharedIslands).length === 0) return dataset;
  return {
    ...dataset,
    islands: {
      ...dataset.islands,
      ...sharedIslands,
    },
  };
}
