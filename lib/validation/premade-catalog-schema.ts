import { z } from "zod";
import { islandSchema } from "@/lib/validation/dataset-schema";
import { normalizeLegacySentence } from "@/lib/sentence-utils";
import type { Island } from "@/types/sentence";
import type { PremadeCatalog } from "@/types/premade-catalog";

const premadeFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  description: z.string().default(""),
  themeKanji: z.string().default("島"),
});

export const premadeCatalogSchema = z.object({
  updatedAt: z.string().min(1),
  folders: z.array(premadeFolderSchema).default([]),
  islands: z.record(z.string(), islandSchema).default({}),
  islandFolderAssignments: z.record(z.string(), z.string()).default({}),
});

function normalizePremadeIslands(
  islands: Record<string, z.infer<typeof islandSchema>>
): Record<string, Island> {
  return Object.fromEntries(
    Object.entries(islands).map(([key, island]) => [
      key,
      {
        description: island.description,
        subtopics: island.subtopics,
        title: island.title,
        themeKanji: island.themeKanji,
        featured: island.featured,
        format: island.format,
        speakers: island.speakers,
        sentences: island.sentences.map((s) => normalizeLegacySentence(s)),
      },
    ])
  );
}

export function parsePremadeCatalog(json: unknown): PremadeCatalog {
  const parsed = premadeCatalogSchema.parse(json);
  return {
    ...parsed,
    islands: normalizePremadeIslands(parsed.islands),
  };
}
