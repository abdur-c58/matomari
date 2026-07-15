/**
 * Build public/premade-catalog.json from Documents/FolderForKotoshima.
 *
 * Usage:
 *   npx tsx scripts/build-premade-catalog.ts
 *   npx tsx scripts/build-premade-catalog.ts --source "C:/path/to/FolderForKotoshima"
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  applyNarrationDirectivesToCatalogIslands,
  parseNarrationDirectivesSidecar,
} from "../lib/audio/narration-directives";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { Island, Sentence } from "../types/sentence";
import type { PremadeCatalog, PremadeFolder } from "../types/premade-catalog";
import { withNamePlaceholder } from "./lib/name-placeholders";

const DEFAULT_SOURCE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Documents",
  "FolderForKotoshima"
);

const OUT_PATH = path.join(process.cwd(), "public", "premade-catalog.json");
const NARRATION_DIRECTIVES_PATH = path.join(
  process.cwd(),
  "scripts",
  "data",
  "narration-audio-directives.json"
);

const FOLDER_THEME_KANJI: Record<string, string> = {
  learn_the_basics: "基",
  family_and_relationships: "家",
  household_and_daily_life: "日",
  social_interactions: "交",
  hobbies: "趣",
  work: "仕",
  travel_and_abroad: "旅",
  eating_out_and_shopping: "食",
};

/** Featured 300-essentials island display titles by parent folder id + leaf dir name. */
const ESSENTIALS_TITLES: Record<string, string> = {
  "learn_the_basics|300 Language Essentials": "300 Language Essentials",
  "household_and_daily_life|300 Essentials": "300 Essentials for Daily Life",
  "hobbies|300 Essentials": "300 Essentials for Hobbies",
  "work|300 Essentials": "300 Essentials for Work",
};

function stripLeadingNumber(name: string): string {
  return name.replace(/^\d+[-–—.]?\s*/, "").trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeEnglish(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.’']/g, "'");
}

function sentenceIdFromEnglish(english: string): string {
  const hash = crypto
    .createHash("sha1")
    .update(normalizeEnglish(english))
    .digest("hex")
    .slice(0, 10);
  return `premade_sent_${hash}`;
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readOptionalDescription(dir: string): string | null {
  const file = path.join(dir, "DESCRIPTION.txt");
  if (!fs.existsSync(file)) return null;
  return readText(file).trim() || null;
}

function listSentenceFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /^sentences.*\.txt$/i.test(name))
    .sort((a, b) => {
      // sentences.txt first, then sentences (1).txt, etc.
      const an = a.toLowerCase();
      const bn = b.toLowerCase();
      if (an === "sentences.txt") return -1;
      if (bn === "sentences.txt") return 1;
      return an.localeCompare(bn, undefined, { numeric: true });
    })
    .map((name) => path.join(dir, name));
}

function parseSentencesFromFiles(files: string[]): string[] {
  const lines: string[] = [];
  const seenLocal = new Set<string>();

  for (const file of files) {
    const text = readText(file);
    for (const raw of text.split(/\r?\n/)) {
      let line = raw.trim();
      if (!line) continue;
      line = line.replace(/^\d+\.\s*/, "").trim();
      if (!line) continue;
      const key = normalizeEnglish(line);
      if (seenLocal.has(key)) continue;
      seenLocal.add(key);
      lines.push(line);
    }
  }

  return lines;
}

function isLeafIslandDir(dir: string): boolean {
  const children = fs.readdirSync(dir, { withFileTypes: true });
  const hasSubdirs = children.some((c) => c.isDirectory());
  if (hasSubdirs) return false;
  return listSentenceFiles(dir).length > 0;
}

function essentialsTitle(folderId: string, leafName: string): string | null {
  const key = `${folderId}|${leafName}`;
  if (ESSENTIALS_TITLES[key]) return ESSENTIALS_TITLES[key];
  if (folderId === "work" && /^300 essentials$/i.test(leafName)) {
    return "300 Essentials for Work";
  }
  if (/^300 language essentials$/i.test(leafName)) {
    return "300 Language Essentials";
  }
  if (/^300 essentials$/i.test(leafName)) {
    if (folderId === "household_and_daily_life") return "300 Essentials for Daily Life";
    if (folderId === "hobbies") return "300 Essentials for Hobbies";
    if (folderId === "work") return "300 Essentials for Work";
  }
  return null;
}

function isEssentialsLeaf(leafName: string): boolean {
  return /^300(\s|$)/i.test(leafName);
}

function islandThemeKanji(title: string, featured: boolean, folderKanji: string): string {
  if (featured) return "三";
  // Prefer a meaningful character from theme when possible; fallback folder kanji
  const map: Record<string, string> = {
    daily_routine: "慣",
    habits: "習",
    language_learning: "語",
    language_patterns: "文",
    location_directions: "方",
    q_a: "問",
    q_and_a: "問",
    talking_about_yourself: "自",
    time: "時",
    family: "族",
    friends_friendships: "友",
    dating_relationships: "恋",
  };
  const slug = slugify(title);
  return map[slug] ?? folderKanji;
}

function isNarrationLeaf(leafName: string, title: string): boolean {
  const slug = slugify(leafName);
  const titleSlug = slugify(title);
  return (
    /^(q_?and_?a|q_?a)$/i.test(slug) ||
    /^(q_?and_?a|q_?a)$/i.test(titleSlug) ||
    /^q\s*&\s*a$/i.test(leafName.trim()) ||
    /^q\s*&\s*a$/i.test(title.trim())
  );
}

function buildCatalog(sourceRoot: string): PremadeCatalog {
  const englishToId = new Map<string, string>();
  const folders: PremadeFolder[] = [];
  const islands: Record<string, Island> = {};
  const islandFolderAssignments: Record<string, string> = {};
  const usedIslandKeys = new Set<string>();

  const topDirs = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => {
      const an = parseInt(a, 10);
      const bn = parseInt(b, 10);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a.localeCompare(b);
    });

  topDirs.forEach((topName, index) => {
    const topPath = path.join(sourceRoot, topName);
    const displayName = stripLeadingNumber(topName);
    const folderId = slugify(displayName);
    const folderDesc = readOptionalDescription(topPath) ?? "";
    const themeKanji = FOLDER_THEME_KANJI[folderId] ?? "島";

    folders.push({
      id: folderId,
      name: displayName,
      order: index + 1,
      description: folderDesc,
      themeKanji,
    });

    const leafDirs = fs
      .readdirSync(topPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));

    for (const leafName of leafDirs) {
      const leafPath = path.join(topPath, leafName);
      if (!isLeafIslandDir(leafPath)) continue;

      const files = listSentenceFiles(leafPath);
      const englishLines = parseSentencesFromFiles(files);
      if (englishLines.length === 0) continue;

      const featuredTitle = essentialsTitle(folderId, leafName);
      const featured = Boolean(featuredTitle) || isEssentialsLeaf(leafName);
      const title =
        featuredTitle ??
        (isEssentialsLeaf(leafName)
          ? titleCaseWords(leafName)
          : titleCaseWords(leafName));

      let islandKey = `premade_${slugify(title)}`;
      if (usedIslandKeys.has(islandKey)) {
        islandKey = `premade_${folderId}_${slugify(leafName)}`;
      }
      usedIslandKeys.add(islandKey);

      const leafDesc = readOptionalDescription(leafPath);
      const description =
        leafDesc ??
        (featured
          ? leafDesc ?? `High-impact ${title.toLowerCase()} sentences.`
          : `Practice sentences for ${title}.`);

      // Only use DESCRIPTION.txt for 300 essentials leaves (and folders). Other islands: generated.
      const finalDescription =
        featured && leafDesc
          ? leafDesc
          : featured
            ? description
            : `Practice sentences for ${title}.`;

      const subtopic = slugify(leafName) || "general";
      const narration = isNarrationLeaf(leafName, title);
      const sentences: Sentence[] = englishLines.map((englishRaw, index) => {
        const english = withNamePlaceholder(englishRaw);
        const norm = normalizeEnglish(english);
        let id = englishToId.get(norm);
        if (!id) {
          id = sentenceIdFromEnglish(english);
          englishToId.set(norm, id);
        }
        return {
          id,
          english,
          register: "polite" as const,
          difficulty: featured ? 2 : 1,
          category: folderId,
          subtopic,
          tags: featured ? ["essentials", "featured"] : [],
          translated: false,
          ...(english.includes("[name]")
            ? {
                placeholders: [
                  {
                    tag: "name" as const,
                    resolveAs: "learner" as const,
                    readingSubstitute: "なまえ",
                  },
                ],
              }
            : {}),
          ...(narration
            ? { speaker: index % 2 === 0 ? ("A" as const) : ("B" as const) }
            : {}),
        };
      });

      islands[islandKey] = {
        title,
        description: finalDescription,
        subtopics: [subtopic],
        themeKanji: islandThemeKanji(title, featured, themeKanji),
        featured: featured || undefined,
        ...(narration
          ? { format: "narration" as const, speakers: ["A", "B"] as const }
          : {}),
        sentences,
      };
      islandFolderAssignments[islandKey] = folderId;
    }
  });

  return {
    updatedAt: new Date().toISOString(),
    folders,
    islands,
    islandFolderAssignments,
  };
}

function main() {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.slice("--source=".length)
    ?? (process.argv.includes("--source")
      ? process.argv[process.argv.indexOf("--source") + 1]
      : undefined);

  const sourceRoot = sourceArg || DEFAULT_SOURCE;
  if (!fs.existsSync(sourceRoot)) {
    console.error(`Source folder not found: ${sourceRoot}`);
    process.exit(1);
  }

  const catalog = buildCatalog(sourceRoot);

  const hasNarration = Object.values(catalog.islands).some(
    (island) => island.format === "narration"
  );
  if (hasNarration) {
    if (!fs.existsSync(NARRATION_DIRECTIVES_PATH)) {
      throw new Error(
        `Narration island(s) require ${NARRATION_DIRECTIVES_PATH}. Run: npm run annotate-narration-audio`
      );
    }
    const sidecar = parseNarrationDirectivesSidecar(
      JSON.parse(fs.readFileSync(NARRATION_DIRECTIVES_PATH, "utf8"))
    );
    catalog.islands = applyNarrationDirectivesToCatalogIslands(
      catalog.islands,
      sidecar,
      { requireFullCoverage: true }
    );
  }

  const validated = parsePremadeCatalog(catalog);

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(validated, null, 2)}\n`, "utf8");

  const islandCount = Object.keys(validated.islands).length;
  const sentenceCount = Object.values(validated.islands).reduce(
    (n, i) => n + i.sentences.length,
    0
  );
  const uniqueIds = new Set(
    Object.values(validated.islands).flatMap((i) => i.sentences.map((s) => s.id))
  );
  const withNarrationAudio = Object.values(validated.islands).reduce(
    (n, island) =>
      n + island.sentences.filter((s) => Boolean(s.narrationAudio)).length,
    0
  );

  console.log(`Wrote ${OUT_PATH}`);
  console.log(
    `Folders: ${validated.folders.length}, islands: ${islandCount}, sentences: ${sentenceCount}, unique ids: ${uniqueIds.size}, narrationAudio: ${withNarrationAudio}`
  );
}

main();
