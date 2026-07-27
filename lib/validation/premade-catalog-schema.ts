import { z } from "zod";
import { sceneSchema } from "@/lib/validation/dataset-schema";
import { normalizeLegacySentence } from "@/lib/sentence-utils";
import type { Scene } from "@/types/sentence";
import type { PremadeCatalog } from "@/types/premade-catalog";

const premadeFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  description: z.string().default(""),
  themeKanji: z.string().default("島"),
});

export const premadeCatalogSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if ("islands" in obj && !("scenes" in obj)) {
        const { islands, ...rest } = obj;
        return { ...rest, scenes: islands };
      }
      if ("islandFolderAssignments" in obj && !("sceneFolderAssignments" in obj)) {
        const { islandFolderAssignments, ...rest } = obj;
        return { ...rest, sceneFolderAssignments: islandFolderAssignments };
      }
    }
    return val;
  },
  z.object({
    updatedAt: z.string().min(1),
    folders: z.array(premadeFolderSchema).default([]),
    scenes: z.record(z.string(), sceneSchema).default({}),
    sceneFolderAssignments: z.record(z.string(), z.string()).default({}),
  })
);

function normalizePremadeScenes(
  scenes: Record<string, z.infer<typeof sceneSchema>>
): Record<string, Scene> {
  return Object.fromEntries(
    Object.entries(scenes).map(([key, scene]) => [
      key,
      {
        description: scene.description,
        subtopics: scene.subtopics,
        title: scene.title,
        themeKanji: scene.themeKanji,
        featured: scene.featured,
        format: scene.format,
        speakers: scene.speakers,
        sentences: scene.sentences.map((s) => normalizeLegacySentence(s)),
      },
    ])
  );
}

export function parsePremadeCatalog(json: unknown): PremadeCatalog {
  const parsed = premadeCatalogSchema.parse(json);
  return {
    ...parsed,
    scenes: normalizePremadeScenes(parsed.scenes),
  };
}
