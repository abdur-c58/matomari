/**
 * Credit-efficient audit of shared standard translations via GPT-5.4-mini.
 *
 * - Joins premade catalog English + metadata to shared_sentence_translations
 * - Dedupes by english+japanese, audits unique pairs only
 * - Dense flag-only batches; resume via checkpoint
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/audit-shared-translations.ts
 *   npx tsx --env-file=.env.local scripts/audit-shared-translations.ts --resume
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import { fetchSharedTranslationsFromDb } from "../lib/supabase/shared-translations-data";
import type { SeedSentence } from "../types/sentence";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const OUT_PATH = path.join(ROOT, "_en_scan_chunks", "translation-audit.json");
const BATCH_SIZE = 45;
const MODEL = process.env.OPENAI_AUDIT_MODEL?.trim() || "gpt-5.4-mini";

type AuditPair = {
  id: string;
  english: string;
  japanese: string;
  reading?: string;
  register: string;
  category: string;
  subtopic: string;
  sceneTitle?: string;
  siblingIds: string[];
};

type Flag = {
  id: string;
  severity: "high" | "medium";
  issues: string[];
  note: string;
  english?: string;
  japanese?: string;
  siblingIds?: string[];
};

const PRIORITY_CATEGORIES = [
  "travel_and_abroad",
  "eating_out_and_shopping",
  "work",
  "social_interactions",
  "household_and_daily_life",
  "family_and_relationships",
  "hobbies",
  "learn_the_basics",
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

function normalizePairKey(english: string, japanese: string): string {
  return `${english.trim().toLowerCase().replace(/\s+/g, " ")}||${japanese.trim()}`;
}

function categoryPriority(category: string): number {
  const i = PRIORITY_CATEGORIES.indexOf(category);
  return i === -1 ? PRIORITY_CATEGORIES.length : i;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function buildPairs(): Promise<AuditPair[]> {
  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );
  const seedById = new Map<
    string,
    SeedSentence & { sceneTitle?: string }
  >();
  for (const [, scene] of Object.entries(catalog.scenes)) {
    for (const s of scene.sentences) {
      seedById.set(s.id, { ...s, sceneTitle: scene.title });
    }
  }

  const shared = await fetchSharedTranslationsFromDb();
  if (!shared) throw new Error("Could not fetch shared translations (check Supabase env)");

  const byKey = new Map<string, AuditPair>();

  for (const [sentenceId, dialects] of Object.entries(shared.translations)) {
    const standard = dialects.standard;
    const japanese = standard?.japanese?.trim();
    if (!japanese) continue;
    const seed = seedById.get(sentenceId);
    if (!seed) continue; // pathway / unknown — premade-only this pass

    const key = normalizePairKey(seed.english, japanese);
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.siblingIds.includes(sentenceId) && sentenceId !== existing.id) {
        existing.siblingIds.push(sentenceId);
      }
      continue;
    }

    byKey.set(key, {
      id: sentenceId,
      english: seed.english,
      japanese,
      reading: standard?.reading,
      register: seed.register,
      category: seed.category,
      subtopic: seed.subtopic,
      sceneTitle: seed.sceneTitle,
      siblingIds: [],
    });
  }

  return [...byKey.values()].sort((a, b) => {
    const pc = categoryPriority(a.category) - categoryPriority(b.category);
    if (pc !== 0) return pc;
    return a.english.localeCompare(b.english);
  });
}

async function auditBatch(
  client: OpenAI,
  batch: AuditPair[],
  batchIndex: number,
  batchCount: number
): Promise<Flag[]> {
  const payload = batch.map((p) => ({
    id: p.id,
    english: p.english,
    japanese: p.japanese,
    register: p.register,
    category: p.category,
    subtopic: p.subtopic,
  }));

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You audit English→Japanese translations for a language-learning app.

Flag ONLY clearly poor Japanese. Do not flag acceptable natural translations.

Flag when:
- Unnecessary あなた/きみ (pronoun)
- Literal loanword/calque where a domain-native term is standard (wrong_domain_term) — e.g. airport "gate"→ゲート instead of 搭乗口
- English-shaped or stiff textbook Japanese (calque / stiff)
- Meaning drift or wrong sense (mistranslation)

Use category/subtopic as domain context (travel/airport/hotel/restaurant/station/etc.).

Return JSON only:
{"flags":[{"id":"...","severity":"high|medium","issues":["pronoun"|"calque"|"wrong_domain_term"|"stiff"|"mistranslation"],"note":"short"}]}

Omit ok sentences entirely. Keep notes under 120 chars.`,
      },
      {
        role: "user",
        content: `Batch ${batchIndex + 1}/${batchCount}. Audit:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error(`Empty audit response for batch ${batchIndex + 1}`);
  const parsed = JSON.parse(raw) as { flags?: Flag[] };
  const flags = Array.isArray(parsed.flags) ? parsed.flags : [];
  const byId = new Map(batch.map((p) => [p.id, p]));

  return flags
    .filter((f) => f?.id && byId.has(f.id))
    .map((f) => {
      const src = byId.get(f.id)!;
      return {
        id: f.id,
        severity: f.severity === "high" ? "high" : "medium",
        issues: Array.isArray(f.issues) ? f.issues : [],
        note: String(f.note ?? "").slice(0, 200),
        english: src.english,
        japanese: src.japanese,
        siblingIds: src.siblingIds,
      };
    });
}

async function main() {
  loadEnvLocal();
  const resume = process.argv.includes("--resume");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const pairs = await buildPairs();
  console.log(`Unique translated premade pairs: ${pairs.length}`);
  console.log(`Model: ${MODEL}`);

  let startBatch = 0;
  let flags: Flag[] = [];
  if (resume && fs.existsSync(OUT_PATH)) {
    const prev = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as {
      nextBatch?: number;
      flags?: Flag[];
      pairsTotal?: number;
    };
    if (typeof prev.nextBatch === "number" && Array.isArray(prev.flags)) {
      startBatch = prev.nextBatch;
      flags = prev.flags;
      console.log(`Resuming from batch ${startBatch + 1} (${flags.length} flags so far)`);
    }
  }

  const batches = chunk(pairs, BATCH_SIZE);
  const client = new OpenAI({ apiKey });
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  for (let i = startBatch; i < batches.length; i++) {
    console.log(`Auditing batch ${i + 1}/${batches.length} (${batches[i]!.length})…`);
    const part = await auditBatch(client, batches[i]!, i, batches.length);
    flags.push(...part);
    const checkpoint = {
      model: MODEL,
      updatedAt: new Date().toISOString(),
      pairsTotal: pairs.length,
      nextBatch: i + 1,
      complete: i + 1 >= batches.length,
      flagsCount: flags.length,
      flags,
    };
    fs.writeFileSync(OUT_PATH, JSON.stringify(checkpoint, null, 2));
    console.log(`  +${part.length} flags (total ${flags.length})`);
  }

  const high = flags.filter((f) => f.severity === "high").length;
  const medium = flags.filter((f) => f.severity === "medium").length;
  console.log(`Done. Flags: ${flags.length} (high=${high}, medium=${medium})`);
  console.log("Wrote", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
