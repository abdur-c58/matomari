/**
 * Apply conservative [name] placeholders to public/premade-catalog.json.
 * Prefer rebuilding with `npm run build-premade-catalog` (placeholders are built in).
 *
 * Usage:
 *   npx tsx scripts/apply-name-placeholders.ts
 *   npx tsx scripts/apply-name-placeholders.ts --dry-run
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { PremadeCatalog } from "../types/premade-catalog";
import type { Sentence } from "../types/sentence";
import { applyNamePlaceholderToEnglish } from "./lib/name-placeholders";

const OUT_PATH = path.join(process.cwd(), "public", "premade-catalog.json");

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

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
  ) as PremadeCatalog;

  const edits = new Map<string, string>();
  const uniques = new Map<string, string>();

  for (const island of Object.values(catalog.islands)) {
    for (const s of island.sentences) {
      if (uniques.has(s.id)) continue;
      uniques.set(s.id, s.english);
      const next = applyNamePlaceholderToEnglish(s.english);
      if (next) edits.set(s.id, next);
    }
  }

  console.log(`Unique sentences: ${uniques.size}`);
  console.log(`Edits to apply: ${edits.size}${dryRun ? " [dry-run]" : ""}`);
  for (const [id, english] of edits) {
    console.log(`  - ${uniques.get(id)}`);
    console.log(`    → ${english}`);
  }

  if (dryRun || edits.size === 0) return;

  const nextIslands: PremadeCatalog["islands"] = {};
  for (const [key, island] of Object.entries(catalog.islands)) {
    const seen = new Set<string>();
    const sentences: Sentence[] = [];
    for (const s of island.sentences) {
      const newEnglish = edits.get(s.id);
      let sentence: Sentence = newEnglish
        ? { ...s, id: sentenceIdFromEnglish(newEnglish), english: newEnglish }
        : { ...s };
      if (sentence.english.includes("[name]")) {
        const hasName = sentence.placeholders?.some((p) => p.tag === "name");
        if (!hasName) {
          sentence = {
            ...sentence,
            placeholders: [
              ...(sentence.placeholders ?? []),
              {
                tag: "name",
                resolveAs: "learner",
                readingSubstitute: "なまえ",
              },
            ],
          };
        }
      }
      if (seen.has(sentence.id)) continue;
      seen.add(sentence.id);
      sentences.push(sentence);
    }
    nextIslands[key] = { ...island, sentences };
  }

  let rows = 0;
  const unique = new Set<string>();
  let withName = 0;
  for (const island of Object.values(nextIslands)) {
    for (const s of island.sentences) {
      rows++;
      unique.add(s.id);
      if (s.english.includes("[name]")) withName++;
    }
  }

  const next: PremadeCatalog = {
    ...catalog,
    updatedAt: new Date().toISOString(),
    islands: nextIslands,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`rows ${rows}, unique ${unique.size}, with [name] ${withName}`);
}

main();
