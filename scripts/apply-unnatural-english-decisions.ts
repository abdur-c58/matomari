/**
 * Apply GPT rewrite/remove decisions from _en_scan_chunks/rewrite-decisions.json
 * to public/premade-catalog.json and FolderForMatomari source txt files.
 *
 * - Rewrites update english, recompute hash IDs, strip translation fields
 * - Identical english always shares one id
 * - Removes drop sentence rows
 * - Clears shared Supabase translations for affected sentence ids
 *
 * Usage:
 *   npx tsx scripts/apply-unnatural-english-decisions.ts
 *   npx tsx scripts/apply-unnatural-english-decisions.ts --skip-shared
 *   npx tsx scripts/apply-unnatural-english-decisions.ts --source "C:/path/to/FolderForMatomari"
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { PremadeCatalog } from "../types/premade-catalog";
import type { Sentence, TranslatedFields } from "../types/sentence";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const DECISIONS_PATH = path.join(ROOT, "_en_scan_chunks", "rewrite-decisions.json");
const REPORT_PATH = path.join(ROOT, "_en_scan_chunks", "apply-report.json");

const DEFAULT_SOURCE = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Documents",
  "FolderForMatomari"
);

const TRANSLATION_KEYS: (keyof TranslatedFields)[] = [
  "japanese",
  "reading",
  "romaji",
  "literal_note",
  "phonetic_reading",
  "placeholders",
];

type Decision = {
  id: string;
  action: "rewrite" | "remove" | "keep";
  newEnglish?: string;
  rationale: string;
};

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
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

function stripTranslations(sentence: Sentence): Sentence {
  const next: Sentence = { ...sentence, translated: false };
  for (const key of TRANSLATION_KEYS) {
    delete next[key];
  }
  return next;
}

function parseArgs(argv: string[]) {
  let source = DEFAULT_SOURCE;
  let skipShared = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source" && argv[i + 1]) {
      source = argv[++i]!;
    } else if (argv[i] === "--skip-shared") {
      skipShared = true;
    }
  }
  return { source, skipShared };
}

function listSentenceFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/^sentences.*\.txt$/i.test(name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** Match numbered or bare English lines; return english text. */
function extractEnglishFromLine(line: string): string | null {
  const trimmed = line.replace(/^\uFEFF/, "").trimEnd();
  if (!trimmed.trim()) return null;
  const m = trimmed.match(/^\s*\d+[\).\:\-]\s*(.+)$/);
  return (m ? m[1]! : trimmed).trim() || null;
}

function rewriteSourceLine(line: string, newEnglish: string): string {
  const eol = line.endsWith("\r") ? "\r" : "";
  const body = line.replace(/\r$/, "");
  const m = body.match(/^(\s*\d+[\).\:\-]\s*)(.*)$/);
  if (m) return `${m[1]}${newEnglish}${eol}`;
  return `${newEnglish}${eol}`;
}

async function clearSharedTranslations(ids: string[]): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || ids.length === 0) return 0;

  const unique = [...new Set(ids)];
  let cleared = 0;
  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const filter = chunk.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
    const res = await fetch(
      `${url}/rest/v1/shared_sentence_translations?sentence_id=in.(${filter})`,
      {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        },
      }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shared translation delete failed (${res.status}): ${body}`);
    }
    cleared += chunk.length;
  }
  return cleared;
}

function applyCatalog(
  catalog: PremadeCatalog,
  decisions: Decision[]
): {
  catalog: PremadeCatalog;
  oldToNewId: Map<string, string>;
  removedIds: string[];
  rewrittenIds: string[];
  englishRemap: Map<string, string>; // old english -> new english
} {
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const oldToNewId = new Map<string, string>();
  const removedIds: string[] = [];
  const rewrittenIds: string[] = [];
  const englishRemap = new Map<string, string>();

  const englishById = new Map<string, string>();
  for (const scene of Object.values(catalog.scenes)) {
    for (const s of scene.sentences) {
      englishById.set(s.id, s.english);
    }
  }

  // Pre-index existing english → id so rewrites can join existing seeds
  const existingByNorm = new Map<string, string>();
  for (const scene of Object.values(catalog.scenes)) {
    for (const s of scene.sentences) {
      existingByNorm.set(normalizeEnglish(s.english), s.id);
    }
  }

  // Resolve target english + id for each rewrite (collapse duplicates to one target)
  const rewriteTarget = new Map<string, { english: string; id: string }>();
  for (const d of decisions) {
    if (d.action !== "rewrite" || !d.newEnglish?.trim()) continue;
    const english = d.newEnglish.trim();
    const norm = normalizeEnglish(english);
    const existingId = existingByNorm.get(norm);
    // Prefer id of first rewrite aiming at this english within this pass
    let targetId = existingId ?? sentenceIdFromEnglish(english);
    for (const prev of rewriteTarget.values()) {
      if (normalizeEnglish(prev.english) === norm) {
        targetId = prev.id;
        break;
      }
    }
    // If multiple rewrites land on same english, force one id
    const colliding = [...rewriteTarget.values()].find(
      (t) => normalizeEnglish(t.english) === norm
    );
    if (colliding) {
      targetId = colliding.id;
    } else {
      targetId = existingId ?? sentenceIdFromEnglish(english);
    }
    rewriteTarget.set(d.id, { english, id: targetId });
  }

  // Normalize rewriteTarget so identical newEnglish → identical id
  const byNewNorm = new Map<string, { english: string; id: string }>();
  for (const [oldId, t] of rewriteTarget) {
    const norm = normalizeEnglish(t.english);
    const canon = byNewNorm.get(norm) ?? {
      english: t.english,
      id: existingByNorm.get(norm) ?? sentenceIdFromEnglish(t.english),
    };
    byNewNorm.set(norm, canon);
    rewriteTarget.set(oldId, canon);
  }

  for (const d of decisions) {
    const oldEng = englishById.get(d.id);
    if (!oldEng) continue;
    if (d.action === "remove") {
      englishRemap.set(oldEng, "");
    } else if (d.action === "rewrite") {
      const target = rewriteTarget.get(d.id);
      if (target) englishRemap.set(oldEng, target.english);
    }
  }

  for (const [sceneId, scene] of Object.entries(catalog.scenes)) {
    const nextSentences: Sentence[] = [];
    for (const s of scene.sentences) {
      const d = byId.get(s.id);
      if (!d || d.action === "keep") {
        nextSentences.push(s);
        continue;
      }
      if (d.action === "remove") {
        removedIds.push(s.id);
        continue;
      }
      // rewrite
      const target = rewriteTarget.get(s.id);
      if (!target) {
        nextSentences.push(s);
        continue;
      }
      oldToNewId.set(s.id, target.id);
      rewrittenIds.push(s.id);
      nextSentences.push(
        stripTranslations({
          ...s,
          id: target.id,
          english: target.english,
          translated: false,
        })
      );
    }
    catalog.scenes[sceneId] = { ...scene, sentences: nextSentences };
  }

  // Global pass: identical english → same id everywhere
  const canonIdByNorm = new Map<string, string>();
  for (const scene of Object.values(catalog.scenes)) {
    for (const s of scene.sentences) {
      const norm = normalizeEnglish(s.english);
      if (!canonIdByNorm.has(norm)) {
        canonIdByNorm.set(norm, sentenceIdFromEnglish(s.english));
      }
    }
  }
  for (const scene of Object.values(catalog.scenes)) {
    for (const s of scene.sentences) {
      const norm = normalizeEnglish(s.english);
      const canon = canonIdByNorm.get(norm)!;
      if (s.id !== canon) {
        oldToNewId.set(s.id, canon);
        s.id = canon;
      }
    }
  }

  return {
    catalog,
    oldToNewId,
    removedIds: [...new Set(removedIds)],
    rewrittenIds: [...new Set(rewrittenIds)],
    englishRemap,
  };
}

function applySourceFiles(
  sourceRoot: string,
  englishRemap: Map<string, string>
): { filesTouched: number; linesRewritten: number; linesRemoved: number } {
  if (!fs.existsSync(sourceRoot)) {
    console.warn(`Source folder missing: ${sourceRoot}`);
    return { filesTouched: 0, linesRewritten: 0, linesRemoved: 0 };
  }

  const byOldNorm = new Map<string, string>();
  for (const [oldEng, newEng] of englishRemap) {
    byOldNorm.set(normalizeEnglish(oldEng), newEng);
  }

  let filesTouched = 0;
  let linesRewritten = 0;
  let linesRemoved = 0;

  for (const file of listSentenceFiles(sourceRoot)) {
    const raw = fs.readFileSync(file, "utf8");
    const lines = raw.split(/\n/);
    let changed = false;
    const next: string[] = [];
    for (const line of lines) {
      const eng = extractEnglishFromLine(line);
      if (!eng) {
        next.push(line);
        continue;
      }
      const mapped = byOldNorm.get(normalizeEnglish(eng));
      if (mapped === undefined) {
        next.push(line);
        continue;
      }
      changed = true;
      if (mapped === "") {
        linesRemoved++;
        continue; // drop line
      }
      next.push(rewriteSourceLine(line, mapped));
      linesRewritten++;
    }
    if (changed) {
      // Preserve trailing newline style
      const endsWithNl = raw.endsWith("\n");
      const body = next.join("\n");
      fs.writeFileSync(file, endsWithNl && !body.endsWith("\n") ? body + "\n" : body);
      filesTouched++;
    }
  }

  return { filesTouched, linesRewritten, linesRemoved };
}

async function main() {
  loadEnvLocal();
  const { source, skipShared } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(DECISIONS_PATH)) {
    throw new Error(`Missing decisions: ${DECISIONS_PATH}`);
  }

  const decisionsFile = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8")) as {
    decisions: Decision[];
  };
  const decisions = decisionsFile.decisions;
  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );

  const beforeCount = Object.values(catalog.scenes).reduce(
    (n, isl) => n + isl.sentences.length,
    0
  );

  const applied = applyCatalog(catalog, decisions);
  const afterCount = Object.values(applied.catalog.scenes).reduce(
    (n, isl) => n + isl.sentences.length,
    0
  );

  applied.catalog.updatedAt = new Date().toISOString();
  const validated = parsePremadeCatalog(applied.catalog);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(validated, null, 2) + "\n");

  const sourceStats = applySourceFiles(source, applied.englishRemap);

  const affectedIds = [
    ...applied.removedIds,
    ...applied.rewrittenIds,
    ...applied.oldToNewId.keys(),
    ...applied.oldToNewId.values(),
  ];

  let sharedCleared = 0;
  if (!skipShared) {
    sharedCleared = await clearSharedTranslations(affectedIds);
  }

  // Sanity: every unique english has one id
  const idByNorm = new Map<string, Set<string>>();
  for (const scene of Object.values(validated.scenes)) {
    for (const s of scene.sentences) {
      const norm = normalizeEnglish(s.english);
      if (!idByNorm.has(norm)) idByNorm.set(norm, new Set());
      idByNorm.get(norm)!.add(s.id);
    }
  }
  const inconsistent = [...idByNorm.entries()].filter(([, ids]) => ids.size > 1);

  const report = {
    updatedAt: validated.updatedAt,
    beforeCount,
    afterCount,
    removedOccurrences: beforeCount - afterCount,
    decisionSummary: {
      rewrite: decisions.filter((d) => d.action === "rewrite").length,
      remove: decisions.filter((d) => d.action === "remove").length,
      keep: decisions.filter((d) => d.action === "keep").length,
    },
    rewrittenUniqueIds: applied.rewrittenIds.length,
    removedUniqueIds: applied.removedIds.length,
    sourceStats,
    sharedCleared,
    inconsistentEnglishIds: inconsistent.length,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (inconsistent.length) {
    console.warn(
      "WARNING: identical english still has multiple ids:",
      inconsistent.slice(0, 5)
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
