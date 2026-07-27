import fs from "fs";

const BATCH_SIZE = 30;
const INPUT_PRICE = 2.5 / 1_000_000;
const OUTPUT_PRICE = 15 / 1_000_000;

function isTranslated(s: Record<string, unknown>): boolean {
  if (s.translated === true) return true;
  return Boolean(String(s.japanese ?? "").trim());
}

function getAllSentences(dataset: Record<string, unknown>) {
  const map = new Map<string, Record<string, unknown>>();
  const pathway = dataset.main_pathway as { batches?: { sentences?: Record<string, unknown>[] }[] };
  for (const batch of pathway?.batches ?? []) {
    for (const s of batch.sentences ?? []) map.set(String(s.id), s);
  }
  const scenes = dataset.scenes as Record<string, { sentences?: Record<string, unknown>[] }>;
  for (const scene of Object.values(scenes ?? {})) {
    for (const s of scene.sentences ?? []) map.set(String(s.id), s);
  }
  return map;
}

function buildTranslationPrompt(sentences: unknown[]) {
  return `Translate these English sentences into natural Japanese for a casual-first language learning app.

Return valid JSON only:
{
  "translations": {
    "<sentence-id>": {
      "japanese": "natural Japanese",
      "reading": "full kana/furigana reading",
      "romaji": "romaji",
      "literal_note": "optional"
    }
  }
}

SENTENCES:
${JSON.stringify(sentences, null, 2)}`;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function toSeed(s: Record<string, unknown>) {
  return {
    id: s.id,
    english: s.english,
    register: s.register,
    difficulty: s.difficulty,
    category: s.category,
    subtopic: s.subtopic,
    tags: s.tags,
    context_notes: s.context_notes,
    translated: s.translated,
  };
}

export function estimateTranslationCost(untranslatedCount: number, avgEnglishLength = 55) {
  const seeds = Array.from({ length: untranslatedCount }, (_, i) => ({
    id: `s-${i}`,
    english: "X".repeat(avgEnglishLength).replace(/X/g, (m, o) =>
      o === 0 ? "Could you help me find the station?" : "Could you help me find the station?"
    ),
    register: "polite",
    difficulty: 2,
    category: "travel",
    subtopic: "directions",
    tags: ["travel"],
    context_notes: "On the street",
    translated: false,
  }));

  let inputTokens = 0;
  let outputTokens = 0;

  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const chunk = seeds.slice(i, i + BATCH_SIZE);
    inputTokens +=
      estimateTokens(
        "You translate English sentences into natural Japanese for language learners. Return valid JSON only."
      ) + estimateTokens(buildTranslationPrompt(chunk));
    outputTokens += chunk.length * 130;
  }

  const inputCost = inputTokens * INPUT_PRICE;
  const outputCost = outputTokens * OUTPUT_PRICE;

  return {
    untranslatedCount,
    apiCalls: Math.ceil(untranslatedCount / BATCH_SIZE) || 0,
    inputTokens,
    outputTokens,
    gpt54Usd: inputCost + outputCost,
    gpt4oMiniUsd: inputTokens * (0.15 / 1_000_000) + outputTokens * (0.6 / 1_000_000),
  };
}

function analyzeFile(filePath: string) {
  const dataset = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  const all = [...getAllSentences(dataset).values()];
  const untranslated = all.filter((s) => !isTranslated(s));
  const seeds = untranslated.map(toSeed);

  let inputTokens = 0;
  let outputTokens = 0;
  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const chunk = seeds.slice(i, i + BATCH_SIZE);
    inputTokens +=
      estimateTokens(
        "You translate English sentences into natural Japanese for language learners. Return valid JSON only."
      ) + estimateTokens(buildTranslationPrompt(chunk));
    outputTokens += chunk.length * 130;
  }

  const gpt54Usd = inputTokens * INPUT_PRICE + outputTokens * OUTPUT_PRICE;

  return {
    file: filePath,
    totalSentences: all.length,
    untranslated: untranslated.length,
    apiCalls: Math.ceil(untranslated.length / BATCH_SIZE) || 0,
    inputTokens,
    outputTokens,
    gpt54Usd,
    gpt4oMiniUsd: inputTokens * (0.15 / 1_000_000) + outputTokens * (0.6 / 1_000_000),
  };
}

if (process.argv[1]?.includes("estimate-translation-cost")) {
  const file = process.argv[2];
  if (file && fs.existsSync(file)) {
    console.log(JSON.stringify(analyzeFile(file), null, 2));
  } else {
    console.log("Usage: npx tsx scripts/estimate-translation-cost.ts <dataset.json>");
    console.log("\nTier estimates (GPT-5.4 @ $2.50/$15 per 1M tokens):");
    for (const n of [50, 100, 250, 500, 1000, 2000, 5000]) {
      const e = estimateTranslationCost(n);
      console.log(
        `  ${String(n).padStart(5)} sentences → ~$${e.gpt54Usd.toFixed(2)} (${e.apiCalls} API calls)`
      );
    }
  }
}
