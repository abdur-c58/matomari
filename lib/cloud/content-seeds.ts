import fs from "fs";
import path from "path";
import { parsePremadeCatalog } from "@/lib/validation/premade-catalog-schema";
import type { Dataset } from "@/types/sentence";

export type ContentSeed = {
  legacyId: string;
  english: string;
  source: "premade" | "pathway" | "catalog";
  speaker?: "A" | "B";
  register?: string;
  difficulty?: number | null;
  category?: string;
  subtopic?: string;
  tags?: string[];
  paralinguisticTags?: string[];
  context_notes?: string;
  narrationAudio?: unknown;
};

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const PATHWAY_PATH = path.join(ROOT, "public", "main-pathway.json");

function loadPathwayFile(): Dataset["main_pathway"] | null {
  if (!fs.existsSync(PATHWAY_PATH)) return null;
  const raw = JSON.parse(fs.readFileSync(PATHWAY_PATH, "utf8")) as {
    main_pathway?: Dataset["main_pathway"];
    batches?: Dataset["main_pathway"]["batches"];
  };
  if (raw.main_pathway?.batches?.length) return raw.main_pathway;
  if (raw.batches?.length) {
    return raw as Dataset["main_pathway"];
  }
  return null;
}

/** Load canonical English seeds from local catalog + pathway JSON. */
export function loadContentSeedsFromFiles(): ContentSeed[] {
  const byId = new Map<string, ContentSeed>();

  if (fs.existsSync(CATALOG_PATH)) {
    const catalog = parsePremadeCatalog(
      JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
    );
    for (const island of Object.values(catalog.islands)) {
      for (const s of island.sentences) {
        byId.set(s.id, {
          legacyId: s.id,
          english: s.english,
          source: "premade",
          speaker: s.speaker,
          register: s.register,
          difficulty: s.difficulty,
          category: s.category,
          subtopic: s.subtopic,
          tags: s.tags,
          paralinguisticTags: s.paralinguisticTags,
          context_notes: s.context_notes,
          narrationAudio: s.narrationAudio,
        });
      }
    }
  }

  const pathway = loadPathwayFile();
  for (const batch of pathway?.batches ?? []) {
    for (const raw of batch.sentences ?? []) {
      const s = raw as {
        id: string;
        english: string;
        register?: string;
        difficulty?: number;
        category?: string;
        subtopic?: string;
        tags?: string[];
        context_notes?: string;
        speaker?: "A" | "B";
      };
      if (!s.id || !s.english) continue;
      byId.set(s.id, {
        legacyId: s.id,
        english: s.english,
        source: "pathway",
        speaker: s.speaker,
        register: s.register,
        difficulty: s.difficulty,
        category: s.category,
        subtopic: s.subtopic,
        tags: s.tags,
        context_notes: s.context_notes,
      });
    }
  }

  return [...byId.values()];
}

export function seedToMetadata(seed: ContentSeed): Record<string, unknown> {
  return {
    register: seed.register ?? "polite",
    difficulty: seed.difficulty === null ? null : (seed.difficulty ?? 1),
    category: seed.category ?? "",
    subtopic: seed.subtopic ?? "",
    tags: seed.tags ?? [],
    ...(seed.paralinguisticTags?.length
      ? { paralinguisticTags: seed.paralinguisticTags }
      : {}),
    ...(seed.narrationAudio ? { narrationAudio: seed.narrationAudio } : {}),
    context_notes: seed.context_notes ?? "",
    speaker: seed.speaker ?? "A",
  };
}
