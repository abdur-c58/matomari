import type { Dataset } from "@/types/sentence";
import type { StudyUnitRef } from "@/lib/services/study-unit-service";

export const PATHWAY_THEME_KANJI = "道";

export function getStudyUnitKanji(
  dataset: Dataset | null,
  ref: StudyUnitRef
): string {
  if (!dataset) return "島";
  if (ref.kind === "pathway") return PATHWAY_THEME_KANJI;
  return dataset.islands[ref.key]?.themeKanji ?? "島";
}

export async function fetchIslandThemeKanji(input: {
  title: string;
  description: string;
  subtopics?: string[];
}): Promise<string | null> {
  const res = await fetch("/api/ai/island-kanji", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (res.status === 503) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as { themeKanji?: string };
  const kanji = data.themeKanji?.trim();
  if (!kanji) return null;
  return kanji.slice(0, 2);
}

export function islandsMissingThemeKanji(dataset: Dataset): string[] {
  return Object.entries(dataset.islands)
    .filter(([, island]) => !island.themeKanji?.trim())
    .map(([key]) => key);
}
