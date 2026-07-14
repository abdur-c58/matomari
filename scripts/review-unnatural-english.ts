/**
 * Ask GPT-5.4 to classify flagged unnatural English seeds as rewrite vs remove.
 *
 * Usage:
 *   npx tsx scripts/review-unnatural-english.ts
 *
 * Writes: _en_scan_chunks/rewrite-decisions.json
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const FLAGGED_PATH = path.join(ROOT, "unnatural-english-sentences.txt");
const OUT_PATH = path.join(ROOT, "_en_scan_chunks", "rewrite-decisions.json");
const BATCH_SIZE = 35;
const MODEL = process.env.OPENAI_REVIEW_MODEL?.trim() || "gpt-5.4";

type FlaggedRow = {
  id: string;
  english: string;
  reason: string;
  islands: string[];
  occurrences: number;
};

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

function parseFlaggedFile(): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of fs.readFileSync(FLAGGED_PATH, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("premade_sent_")) continue;
    const parts = line.split(" | ");
    if (parts.length < 3) continue;
    const id = parts[0]!.trim();
    const reason = parts.slice(2).join(" | ").trim();
    map.set(id, reason);
  }
  return map;
}

function buildFlaggedRows(): FlaggedRow[] {
  const reasons = parseFlaggedFile();
  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );

  const byId = new Map<
    string,
    { english: string; islands: Set<string>; occurrences: number }
  >();

  for (const [islandId, island] of Object.entries(catalog.islands)) {
    for (const s of island.sentences) {
      if (!reasons.has(s.id)) continue;
      const cur = byId.get(s.id) ?? {
        english: s.english,
        islands: new Set<string>(),
        occurrences: 0,
      };
      cur.english = s.english;
      cur.islands.add(island.title || islandId);
      cur.occurrences += 1;
      byId.set(s.id, cur);
    }
  }

  return [...byId.entries()]
    .map(([id, row]) => ({
      id,
      english: row.english,
      reason: reasons.get(id) ?? "",
      islands: [...row.islands].sort(),
      occurrences: row.occurrences,
    }))
    .sort((a, b) => a.english.localeCompare(b.english));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function reviewBatch(
  client: OpenAI,
  batch: FlaggedRow[],
  batchIndex: number,
  batchCount: number
): Promise<Decision[]> {
  const payload = batch.map((r) => ({
    id: r.id,
    english: r.english,
    flagReason: r.reason,
    islands: r.islands,
    occurrences: r.occurrences,
  }));

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You clean English seeds for a Japanese-learning app.

For each item, choose ONE action:
- "rewrite": keep the teaching intent; return natural English a native would say. Prefer minimal changes.
- "remove": drop it — vague, empty, garbled, no clear teaching point, or salvage would invent a new sentence.
- "keep": only if the flagged English is already natural enough (false positive). Do NOT rewrite on keep.

Hard rules:
- Keep intentional [name] placeholders exactly as [name] when the sentence personalizes a name (e.g. "My name is [name]."). These are NOT broken.
- Do not invent Japanese. English only.
- newEnglish required for rewrite; omit for remove/keep.
- newEnglish must be a single natural sentence (or short question), same register intent.
- If several items are near-duplicates, rewrite them to the SAME newEnglish when that makes sense (shared meaning).
- Avoid empty abstracts like "I do daily activities" — remove those.
- Textbook present-simple-with-today drills: rewrite to natural progressive/future when the intent is clear; remove if incomplete (missing object like "He stops today").

Return JSON only:
{"decisions":[{"id":"...","action":"rewrite|remove|keep","newEnglish":"...","rationale":"..."}]}`,
      },
      {
        role: "user",
        content: `Batch ${batchIndex + 1}/${batchCount}. Classify every item:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error(`Empty response for batch ${batchIndex + 1}`);

  const parsed = JSON.parse(raw) as { decisions?: Decision[] };
  if (!Array.isArray(parsed.decisions)) {
    throw new Error(`Bad JSON shape for batch ${batchIndex + 1}`);
  }

  const byId = new Map(parsed.decisions.map((d) => [d.id, d]));
  const out: Decision[] = [];
  for (const row of batch) {
    const d = byId.get(row.id);
    if (!d) {
      throw new Error(`Missing decision for ${row.id} in batch ${batchIndex + 1}`);
    }
    if (d.action === "rewrite" && !d.newEnglish?.trim()) {
      throw new Error(`Rewrite missing newEnglish for ${row.id}`);
    }
    out.push({
      id: row.id,
      action: d.action,
      newEnglish: d.newEnglish?.trim(),
      rationale: d.rationale ?? "",
    });
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const rows = buildFlaggedRows();
  console.log(`Model: ${MODEL}`);
  console.log(`Flagged unique IDs in catalog: ${rows.length}`);

  const client = new OpenAI({ apiKey });
  const batches = chunk(rows, BATCH_SIZE);
  const decisions: Decision[] = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`Reviewing batch ${i + 1}/${batches.length} (${batches[i]!.length})…`);
    const part = await reviewBatch(client, batches[i]!, i, batches.length);
    decisions.push(...part);
    const tmp = {
      model: MODEL,
      updatedAt: new Date().toISOString(),
      decisions,
      partial: i + 1 < batches.length,
    };
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(tmp, null, 2));
  }

  const summary = {
    rewrite: decisions.filter((d) => d.action === "rewrite").length,
    remove: decisions.filter((d) => d.action === "remove").length,
    keep: decisions.filter((d) => d.action === "keep").length,
  };

  const final = {
    model: MODEL,
    updatedAt: new Date().toISOString(),
    summary,
    decisions,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(final, null, 2));
  console.log("Wrote", OUT_PATH);
  console.log(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
