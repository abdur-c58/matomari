/**
 * Annotate narration scene turns with pauseAfterMs + sparse Fish Audio cues.
 *
 * Output sidecar: scripts/data/narration-audio-directives.json
 * Optionally merges into public/premade-catalog.json (--apply, default).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/annotate-narration-audio.ts
 *   npx tsx --env-file=.env.local scripts/annotate-narration-audio.ts --resume
 *   npx tsx --env-file=.env.local scripts/annotate-narration-audio.ts --no-apply
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import {
  FISH_EFFECT_CUES,
  FISH_EXPRESSION_CUES,
  NARRATION_PAUSE_MS_OPTIONS,
  clampNarrationPauseMs,
  isFishEffectCue,
  isFishExpressionCue,
  parseFishAudioDirectives,
  type FishAudioDirectives,
  type NarrationPauseMs,
} from "../lib/audio/fish-audio-cues";
import {
  applyNarrationDirectivesToCatalogScenes,
  narrationDirectiveKey,
  parseNarrationDirectivesSidecar,
  type NarrationDirectiveRecord,
  type NarrationDirectivesSidecar,
} from "../lib/audio/narration-directives";
import { fetchSharedTranslationsFromDb } from "../lib/supabase/shared-translations-data";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { NarrationSpeaker, Sentence } from "../types/sentence";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const SIDECAR_PATH = path.join(
  ROOT,
  "scripts",
  "data",
  "narration-audio-directives.json"
);
const CHECKPOINT_PATH = path.join(
  ROOT,
  "_en_scan_chunks",
  "narration-audio-annotation.json"
);
const BATCH_SIZE = 18;
const MODEL = process.env.OPENAI_ANNOTATE_MODEL?.trim() || "gpt-5.4-mini";

type TurnRow = {
  sceneKey: string;
  index: number;
  sentenceId: string;
  occurrence: number;
  speaker: NarrationSpeaker;
  english: string;
  japanese?: string;
};

type ModelTurnAnnotation = {
  sentenceId: string;
  occurrence: number;
  pauseAfterMs: number;
  expression?: string | null;
  effect?: string | null;
};

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

function buildTurnRows(
  scenes: Record<string, { format?: string; sentences: Sentence[] }>
): TurnRow[] {
  const rows: TurnRow[] = [];
  for (const [sceneKey, scene] of Object.entries(scenes)) {
    if (scene.format !== "narration") continue;
    const occurrenceById = new Map<string, number>();
    scene.sentences.forEach((sentence, index) => {
      const occurrence = occurrenceById.get(sentence.id) ?? 0;
      occurrenceById.set(sentence.id, occurrence + 1);
      rows.push({
        sceneKey,
        index,
        sentenceId: sentence.id,
        occurrence,
        speaker: sentence.speaker === "B" ? "B" : "A",
        english: sentence.english,
      });
    });
  }
  return rows;
}

function warnSpeakerAlternation(rows: TurnRow[]): void {
  const breaks: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.sceneKey !== rows[i - 1]!.sceneKey) continue;
    if (rows[i]!.speaker === rows[i - 1]!.speaker) {
      breaks.push(rows[i]!.index);
    }
  }
  if (breaks.length > 0) {
    console.warn(
      `Note: ${breaks.length} speaker non-alternation(s) (topic boundaries): indices ${breaks.join(", ")}`
    );
  }
}

function sanitizeAnnotation(
  raw: ModelTurnAnnotation,
  expected: TurnRow
): NarrationDirectiveRecord {
  if (
    raw.sentenceId !== expected.sentenceId ||
    raw.occurrence !== expected.occurrence
  ) {
    throw new Error(
      `Model returned mismatched turn key: got ${raw.sentenceId}#${raw.occurrence}, expected ${expected.sentenceId}#${expected.occurrence}`
    );
  }

  const pauseAfterMs = clampNarrationPauseMs(raw.pauseAfterMs) as NarrationPauseMs;
  const fishRaw: FishAudioDirectives = {};
  if (typeof raw.expression === "string" && isFishExpressionCue(raw.expression)) {
    fishRaw.expression = raw.expression;
  }
  if (typeof raw.effect === "string" && isFishEffectCue(raw.effect)) {
    fishRaw.effect = raw.effect;
  }
  const fishAudio = parseFishAudioDirectives(fishRaw);

  return {
    sceneKey: expected.sceneKey,
    sentenceId: expected.sentenceId,
    occurrence: expected.occurrence,
    pauseAfterMs,
    ...(fishAudio ? { fishAudio } : {}),
  };
}

async function annotateBatch(
  client: OpenAI,
  batch: TurnRow[],
  allRows: TurnRow[],
  batchIndex: number,
  batchCount: number
): Promise<NarrationDirectiveRecord[]> {
  const context = batch.map((turn) => {
    const neighbors = allRows
      .filter((r) => r.sceneKey === turn.sceneKey)
      .slice(Math.max(0, turn.index - 2), turn.index + 3)
      .map((r) => ({
        index: r.index,
        speaker: r.speaker,
        sentenceId: r.sentenceId,
        occurrence: r.occurrence,
        english: r.english,
        japanese: r.japanese ?? null,
        target: r.index === turn.index,
      }));
    return {
      sentenceId: turn.sentenceId,
      occurrence: turn.occurrence,
      speaker: turn.speaker,
      english: turn.english,
      japanese: turn.japanese ?? null,
      window: neighbors,
    };
  });

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You annotate Japanese conversation turns for Fish Audio S2.1 TTS delivery.

For EACH target turn return:
- pauseAfterMs: one of ${NARRATION_PAUSE_MS_OPTIONS.join(", ")}
- expression: optional, from ${FISH_EXPRESSION_CUES.join("|")} OR null
- effect: optional, from ${FISH_EFFECT_CUES.join("|")} OR null

Rules:
- Be sparse. Most neutral / factual lines should have NO expression and NO effect.
- Do NOT put curious on every question. Reserve curious for genuine curiosity / soft inquiry.
- Prefer friendly/calm/grateful/surprised/worried/embarrassed/excited only when the line clearly carries that feeling.
- Effects (laughing, chuckling, sighing, gasping, whispering, soft tone, emphasis, clear throat) are rare — only when dialogue clearly warrants it.
- pauseAfterMs reflects conversation beat: shorter after quick back-channel (~250–600), medium after normal turns (~800–1200), longer after topic shifts / apologies / heavy news (~1500–3000).
- Never invent cues outside the allowlists.
- Keep sentenceId + occurrence exactly as given.

Return JSON only:
{"turns":[{"sentenceId":"...","occurrence":0,"pauseAfterMs":800,"expression":null,"effect":null}]}`,
      },
      {
        role: "user",
        content: `Batch ${batchIndex + 1}/${batchCount}. Annotate target turns (window includes neighbors):\n${JSON.stringify(context)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error(`Empty annotation response for batch ${batchIndex + 1}`);
  const parsed = JSON.parse(raw) as { turns?: ModelTurnAnnotation[] };
  const modelTurns = Array.isArray(parsed.turns) ? parsed.turns : [];
  const byKey = new Map<string, ModelTurnAnnotation>(
    modelTurns.map((t) => [`${t.sentenceId}::${t.occurrence}`, t])
  );

  return batch.map((expected) => {
    const key = `${expected.sentenceId}::${expected.occurrence}`;
    const found = byKey.get(key);
    if (!found) {
      // Safe default if model omitted a turn
      return {
        sceneKey: expected.sceneKey,
        sentenceId: expected.sentenceId,
        occurrence: expected.occurrence,
        pauseAfterMs: 800 as NarrationPauseMs,
      };
    }
    return sanitizeAnnotation(found, expected);
  });
}

function summarize(turns: NarrationDirectiveRecord[]) {
  let withExpr = 0;
  let withEffect = 0;
  const exprCounts = new Map<string, number>();
  for (const t of turns) {
    if (t.fishAudio?.expression) {
      withExpr++;
      exprCounts.set(
        t.fishAudio.expression,
        (exprCounts.get(t.fishAudio.expression) ?? 0) + 1
      );
    }
    if (t.fishAudio?.effect) withEffect++;
  }
  const top = [...exprCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]) => `${k}:${n}`)
    .join(", ");
  return { withExpr, withEffect, top };
}

async function main() {
  loadEnvLocal();
  const resume = process.argv.includes("--resume");
  const apply = !process.argv.includes("--no-apply");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );
  const rows = buildTurnRows(catalog.scenes);
  if (rows.length === 0) throw new Error("No narration turns found in catalog");
  warnSpeakerAlternation(rows);

  const shared = await fetchSharedTranslationsFromDb();
  if (shared) {
    for (const row of rows) {
      const jp = shared.translations[row.sentenceId]?.standard?.japanese?.trim();
      if (jp) row.japanese = jp;
    }
  }

  console.log(`Narration turns: ${rows.length}`);
  console.log(`Model: ${MODEL}`);
  console.log(
    `With Japanese: ${rows.filter((r) => r.japanese).length}/${rows.length}`
  );

  let startBatch = 0;
  let annotated: NarrationDirectiveRecord[] = [];

  if (resume && fs.existsSync(CHECKPOINT_PATH)) {
    const prev = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8")) as {
      nextBatch?: number;
      turns?: NarrationDirectiveRecord[];
    };
    if (typeof prev.nextBatch === "number" && Array.isArray(prev.turns)) {
      startBatch = prev.nextBatch;
      annotated = prev.turns;
      console.log(
        `Resuming from batch ${startBatch + 1} (${annotated.length} turns so far)`
      );
    }
  }

  const batches = chunk(rows, BATCH_SIZE);
  const client = new OpenAI({ apiKey });
  fs.mkdirSync(path.dirname(CHECKPOINT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(SIDECAR_PATH), { recursive: true });

  for (let i = startBatch; i < batches.length; i++) {
    const batch = batches[i]!;
    console.log(`Annotating batch ${i + 1}/${batches.length} (${batch.length})…`);
    const part = await annotateBatch(client, batch, rows, i, batches.length);
    annotated.push(...part);
    fs.writeFileSync(
      CHECKPOINT_PATH,
      JSON.stringify(
        {
          model: MODEL,
          updatedAt: new Date().toISOString(),
          turnsTotal: rows.length,
          nextBatch: i + 1,
          complete: i + 1 >= batches.length,
          turns: annotated,
        },
        null,
        2
      )
    );
  }

  if (annotated.length !== rows.length) {
    throw new Error(
      `Coverage mismatch: annotated ${annotated.length} vs expected ${rows.length}`
    );
  }

  const expectedKeys = new Set(
    rows.map((r) =>
      narrationDirectiveKey({
        sceneKey: r.sceneKey,
        sentenceId: r.sentenceId,
        occurrence: r.occurrence,
      })
    )
  );
  const gotKeys = new Set(annotated.map((t) => narrationDirectiveKey(t)));
  for (const key of expectedKeys) {
    if (!gotKeys.has(key)) throw new Error(`Missing annotated key ${key}`);
  }
  for (const key of gotKeys) {
    if (!expectedKeys.has(key)) throw new Error(`Extra annotated key ${key}`);
  }

  // Soft quality checks
  const { withExpr, withEffect, top } = summarize(annotated);
  const exprRatio = withExpr / annotated.length;
  if (exprRatio > 0.55) {
    console.warn(
      `Warning: expressions on ${(exprRatio * 100).toFixed(1)}% of turns (prefer <55%). Top: ${top}`
    );
  }
  if (withEffect / annotated.length > 0.12) {
    console.warn(
      `Warning: effects on ${((withEffect / annotated.length) * 100).toFixed(1)}% of turns (prefer sparse).`
    );
  }

  const sidecar: NarrationDirectivesSidecar = {
    version: 1,
    updatedAt: new Date().toISOString(),
    turns: annotated,
  };
  // Re-parse to enforce allowlists / uniqueness
  const validatedSidecar = parseNarrationDirectivesSidecar(sidecar);
  fs.writeFileSync(SIDECAR_PATH, `${JSON.stringify(validatedSidecar, null, 2)}\n`);
  console.log(`Wrote ${SIDECAR_PATH}`);
  console.log(
    `Expressions: ${withExpr}/${annotated.length}; effects: ${withEffect}; top: ${top || "(none)"}`
  );

  if (apply) {
    const mergedScenes = applyNarrationDirectivesToCatalogScenes(
      catalog.scenes,
      validatedSidecar,
      { requireFullCoverage: true }
    );
    const nextCatalog = {
      ...catalog,
      scenes: mergedScenes,
      updatedAt: new Date().toISOString(),
    };
    const validatedCatalog = parsePremadeCatalog(nextCatalog);
    fs.writeFileSync(
      CATALOG_PATH,
      `${JSON.stringify(validatedCatalog, null, 2)}\n`
    );
    console.log(`Applied directives to ${CATALOG_PATH}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
