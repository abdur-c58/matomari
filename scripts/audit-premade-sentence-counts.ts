/**
 * Audit premade source folder vs catalog vs composed library counts.
 * Usage: npx tsx scripts/audit-premade-sentence-counts.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getAllSentences } from "../lib/validation/dataset-schema";
import { getLibrarySentences } from "../lib/services/library-service";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import { parseDataset } from "../lib/validation/dataset-schema";
import type { Dataset } from "../types/sentence";

const SOURCE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Documents",
  "FolderForKotoshima"
);

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

function walkSentenceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkSentenceFiles(p, out);
    else if (/^sentences/i.test(ent.name) && ent.name.endsWith(".txt")) out.push(p);
  }
  return out;
}

function main() {
  const files = walkSentenceFiles(SOURCE).sort();
  let sourceLines = 0;
  const sourceIds = new Set<string>();
  for (const f of files) {
    for (const raw of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      let line = raw.trim();
      if (!line) continue;
      line = line.replace(/^\d+\.\s*/, "").trim();
      if (!line) continue;
      sourceLines++;
      sourceIds.add(sentenceIdFromEnglish(line));
    }
  }

  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync("public/premade-catalog.json", "utf8"))
  );
  let catalogRows = 0;
  const catalogIds = new Set<string>();
  for (const island of Object.values(catalog.islands)) {
    for (const s of island.sentences) {
      catalogRows++;
      catalogIds.add(s.id);
    }
  }

  const pathway = parseDataset(
    JSON.parse(fs.readFileSync("public/main-pathway.json", "utf8"))
  );
  const composed: Dataset = {
    main_pathway: pathway.main_pathway,
    islands: { ...catalog.islands },
  };
  const all = getAllSentences(composed);
  const library = getLibrarySentences(composed);

  const missingFromCatalog = [...sourceIds].filter((id) => !catalogIds.has(id));
  const extraInCatalog = [...catalogIds].filter((id) => !sourceIds.has(id));

  console.log(
    JSON.stringify(
      {
        folderForKotoshima: {
          exists: fs.existsSync(SOURCE),
          files: files.length,
          lines: sourceLines,
          uniqueIds: sourceIds.size,
        },
        premadeCatalog: {
          islandCount: Object.keys(catalog.islands).length,
          rows: catalogRows,
          uniqueIds: catalogIds.size,
        },
        pathway: {
          sentences: pathway.main_pathway.batches.reduce(
            (n, b) => n + b.sentences.length,
            0
          ),
        },
        composed: {
          allSentencesUnique: all.size,
          libraryIslandOnly: library.length,
          pathwayOnlyInAll: [...all.values()].filter((s) => s.sourceType === "pathway")
            .length,
        },
        consistency: {
          sourceLinesEqCatalogRows: sourceLines === catalogRows,
          sourceUniqueEqCatalogUnique: sourceIds.size === catalogIds.size,
          missingFromCatalog: missingFromCatalog.length,
          extraInCatalog: extraInCatalog.length,
        },
        note:
          "Library UI count = unique island IDs in composed dataset (premade + user). Translate buttons currently count getAllSentences (includes pathway).",
      },
      null,
      2
    )
  );
}

main();
