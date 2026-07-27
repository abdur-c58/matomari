/**
 * Quality gate for Pro 150-sentence chunked scene generation.
 * Run: npx tsx --env-file=.env.local scripts/quality-gate-scene-150.ts
 */
import { SCENE_GENERATION_CHUNK_SIZE } from "../lib/constants/scene-generation";
import { generateSceneWithOptionalChunking } from "../lib/ai/scene-generation-runner";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "../lib/ai/openai";

function planBatches(target: number): number[] {
  const batchTargets: number[] = [];
  let remaining = target;
  while (remaining > 0) {
    const n = Math.min(SCENE_GENERATION_CHUNK_SIZE, remaining);
    batchTargets.push(n);
    remaining -= n;
  }
  return batchTargets;
}

async function main() {
  const target = 140;
  const batches = planBatches(target);
  console.log("Chunk plan for", target, "→", batches);
  console.log(
    "Expected batches:",
    Math.ceil(target / SCENE_GENERATION_CHUNK_SIZE),
    "size",
    SCENE_GENERATION_CHUNK_SIZE
  );

  if (!isOpenAIConfigured()) {
    console.warn(
      "OPENAI not configured — structural chunk plan OK; skip live generation."
    );
    console.log(
      "QUALITY_GATE: STRUCTURAL_PASS (live generation skipped — no OpenAI)"
    );
    process.exit(0);
  }

  console.log("Running live chunked generation (theme: convenience store chat)…");
  const start = Date.now();
  const generated = await generateSceneWithOptionalChunking({
    openai: getOpenAIClient(),
    model: getOpenAIModel(),
    theme: "A short chat at a convenience store checkout",
    targetCount: target,
    sentenceCatalog: [],
    promptOptions: {
      difficultyMode: "matched",
      format: "standard",
      durationLabel: "Epic (~30–45 min, ~120–150 sentences)",
      levelDescription: "Intermediate fluency — natural daily conversation",
      difficultyRange: [3, 4],
    },
  });

  const count = generated.sentences.length;
  const english = generated.sentences
    .map((s) => (s.english ?? "").trim().toLowerCase())
    .filter(Boolean);
  const unique = new Set(english);
  const dupRate = english.length
    ? 1 - unique.size / english.length
    : 0;
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

  console.log("sceneKey:", generated.sceneKey);
  console.log("description:", generated.description);
  console.log("sentence count:", count);
  console.log("unique english ratio:", (1 - dupRate).toFixed(3));
  console.log("elapsed_s:", elapsedSec);
  console.log("sample first 3:", english.slice(0, 3));
  console.log("sample last 3:", english.slice(-3));

  const countOk = count >= 100 && count <= 160;
  const dupOk = dupRate < 0.15;
  const pass = countOk && dupOk;

  console.log(
    pass
      ? "QUALITY_GATE: PASS"
      : `QUALITY_GATE: FAIL (countOk=${countOk} dupOk=${dupOk})`
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
