import type { Scene, SentenceDialectTranslations } from "@/types/sentence";

export async function fetchResolvedSharedScenes(): Promise<{
  scenes: Record<string, Scene>;
  translations: Record<string, SentenceDialectTranslations>;
}> {
  try {
    const res = await fetch("/api/scenes/shared", { cache: "no-store" });
    if (!res.ok) {
      return { scenes: {}, translations: {} };
    }
    return (await res.json()) as {
      scenes: Record<string, Scene>;
      translations: Record<string, SentenceDialectTranslations>;
    };
  } catch {
    return { scenes: {}, translations: {} };
  }
}

export function mergeSharedScenesIntoDataset(
  dataset: {
    main_pathway: unknown;
    scenes: Record<string, Scene>;
  } | null,
  sharedScenes: Record<string, Scene>
) {
  if (!dataset) return dataset;
  if (Object.keys(sharedScenes).length === 0) return dataset;
  return {
    ...dataset,
    scenes: {
      ...dataset.scenes,
      ...sharedScenes,
    },
  };
}
