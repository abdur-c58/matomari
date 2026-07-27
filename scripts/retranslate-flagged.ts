/**
 * Retranslate verified poor shared translations with GPT-5.4 + upgraded prompt.
 * Upserts standard dialect into shared_sentence_translations and clears audio
 * metadata/R2 for those sentence ids.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/retranslate-flagged.ts
 *   npx tsx --env-file=.env.local scripts/retranslate-flagged.ts --dry-run
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { buildTranslationPrompt } from "../lib/ai/prompts";
import { translateResponseSchema } from "../lib/ai/schemas";
import { getOpenAIModelName } from "../lib/env";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import { upsertSharedTranslationBatch } from "../lib/supabase/shared-translations-data";
import {
  listAudioMetadata,
} from "../lib/supabase/server-data";
import { deleteR2Object, isR2Configured } from "../lib/storage/r2-client";
import { getSupabaseSecretKey, getSupabaseUrl } from "../lib/env";
import type { SeedSentence, TranslatedFields } from "../types/sentence";
import { toSeedPayload } from "../lib/sentence-utils";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const VERIFIED_PATH = path.join(
  ROOT,
  "_en_scan_chunks",
  "translation-audit-verified.json"
);
const REPORT_PATH = path.join(
  ROOT,
  "_en_scan_chunks",
  "retranslate-report.json"
);
const BATCH_SIZE = 12;
const MODEL = process.env.OPENAI_RETRANSLATE_MODEL?.trim() || "gpt-5.4";

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function restHeaders(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function clearAudioForSentenceIds(ids: string[]): Promise<number> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return 0;

  const metadata = await listAudioMetadata();
  const rows = metadata.filter((r) => unique.includes(r.sentence_id));
  let deletedR2 = 0;

  if (isR2Configured()) {
    for (const row of rows) {
      try {
        await deleteR2Object(row.r2_key);
        deletedR2++;
      } catch {
        // continue
      }
    }
  }

  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (url && key) {
    const chunkSize = 40;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const part = unique.slice(i, i + chunkSize);
      const filter = part.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
      await fetch(
        `${url}/rest/v1/audio_metadata?sentence_id=in.(${filter})`,
        {
          method: "DELETE",
          headers: restHeaders(key, { Prefer: "return=minimal" }),
        }
      );
    }
  }

  return deletedR2;
}

async function translateBatch(
  client: OpenAI,
  seeds: SeedSentence[]
): Promise<Record<string, TranslatedFields>> {
  const prompt = buildTranslationPrompt(
    seeds.map((s) => ({
      id: s.id,
      english: s.english,
      register: s.register,
      difficulty: s.difficulty,
      category: s.category,
      subtopic: s.subtopic,
      tags: s.tags,
      context_notes: s.context_notes,
    })),
    "standard"
  );

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You translate English sentences into natural Japanese for language learners. Return valid JSON only. The reading field must be kana-only (no kanji), match spoken pronunciation exactly, and preserve correct pitch accent/intonation — the app's TTS engine reads the kanji surface form directly and uses reading as the authoritative pronunciation guide and learner display.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty translate response");
  const parsed = translateResponseSchema.parse(JSON.parse(raw));
  return parsed.translations as Record<string, TranslatedFields>;
}

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  if (!fs.existsSync(VERIFIED_PATH)) {
    throw new Error(`Missing verified list: ${VERIFIED_PATH}`);
  }

  const verified = JSON.parse(fs.readFileSync(VERIFIED_PATH, "utf8")) as {
    sentenceIds: string[];
    flags: Array<{ id: string; english: string; japanese: string }>;
  };

  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );
  const seedById = new Map<string, SeedSentence>();
  for (const scene of Object.values(catalog.scenes)) {
    for (const s of scene.sentences) {
      seedById.set(s.id, toSeedPayload(s));
    }
  }

  const seeds: SeedSentence[] = [];
  const missing: string[] = [];
  for (const id of verified.sentenceIds) {
    const s = seedById.get(id);
    if (!s) missing.push(id);
    else seeds.push(s);
  }

  console.log(`Model: ${MODEL} (env default would be ${getOpenAIModelName()})`);
  console.log(`Verified sentence ids: ${verified.sentenceIds.length}`);
  console.log(`Seeds found in catalog: ${seeds.length}`);
  if (missing.length) console.warn(`Missing from catalog: ${missing.length}`);
  if (dryRun) {
    console.log("Dry run — no API calls.");
    return;
  }

  const client = new OpenAI({ apiKey });
  const batches = chunk(seeds, BATCH_SIZE);
  const allTranslations: Record<string, TranslatedFields> = {};
  const beforeById = new Map(
    verified.flags.map((f) => [f.id, { english: f.english, japanese: f.japanese }])
  );

  for (let i = 0; i < batches.length; i++) {
    console.log(`Retranslating batch ${i + 1}/${batches.length} (${batches[i]!.length})…`);
    const part = await translateBatch(client, batches[i]!);
    Object.assign(allTranslations, part);
    await upsertSharedTranslationBatch(part, "standard");
  }

  const deletedR2 = await clearAudioForSentenceIds(Object.keys(allTranslations));

  const samples = Object.entries(allTranslations)
    .slice(0, 8)
    .map(([id, t]) => ({
      id,
      english: seedById.get(id)?.english,
      before: beforeById.get(id)?.japanese,
      after: t.japanese,
    }));

  const report = {
    updatedAt: new Date().toISOString(),
    model: MODEL,
    requestedIds: verified.sentenceIds.length,
    translatedIds: Object.keys(allTranslations).length,
    missingFromCatalog: missing,
    deletedR2,
    samples,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
