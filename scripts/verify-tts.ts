/**
 * Verify TTS text selection and ElevenLabs normalization.
 * Usage: npm run verify-tts
 */

import { getTtsTextFromFields } from "../lib/audio/tts-text";
import {
  normalizeForElevenLabs,
  promoteSokuonClusters,
  restoreKatakanaLoanwords,
} from "../lib/audio/tts-normalize";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log("\n=== America / 出身 (mp2-6) ===\n");

{
  const tts = getTtsTextFromFields("アメリカ出身です。", "あめりかしゅっしんです。", {
    dialect: "standard",
  });
  assert(tts === "アメリカ出身です。", `uses japanese surface: "${tts}"`);
  assert(!tts?.includes("あめりか"), "does not use all-hiragana loanword");
  assert(!tts?.includes("しゅっしん"), "does not use hiragana しゅっしん cluster");
}

console.log("\n=== Kana fallback normalization ===\n");

{
  const restored = restoreKatakanaLoanwords(
    "あめりかしゅっしんです。",
    "アメリカ出身です。"
  );
  assert(restored.includes("アメリカ"), "restores katakana loanword from japanese");
  assert(restored.includes("しゅっしん"), "keeps hiragana compound before promotion");

  const promoted = promoteSokuonClusters("アメリカしゅっしんです");
  assert(promoted.includes("シュッシン"), "promotes しゅっしん → シュッシン for TTS");

  const normalized = normalizeForElevenLabs("あめりかしゅっしんです。", "アメリカ出身です。", {
    fromKanaReading: true,
  });
  assert(normalized.includes("アメリカ"), "normalized kana path restores loanword");
  assert(
    normalized.includes("シュッシン") || normalized.includes("しゅっしん"),
    "normalized kana path handles 出身 cluster"
  );
}

console.log("\n=== Placeholder sentences still use reading ===\n");

{
  const tts = getTtsTextFromFields("[name]です。", "なまえです。", {
    dialect: "standard",
    placeholders: [{ tag: "name", resolveAs: "learner", readingSubstitute: "なまえ" }],
    learnerName: "パンコ",
  });
  assert(tts === "パンコです。", `placeholder resolved via reading: "${tts}"`);
}

console.log("\n=== Kansai still uses phonetic_reading ===\n");

{
  const tts = getTtsTextFromFields("トムです。", "とむです。", {
    dialect: "kansai",
    phonetic_reading: "トムやで",
  });
  assert(tts === "トムやで", `kansai phonetic: "${tts}"`);
}

{
  const tts = getTtsTextFromFields("アメリカ出身です。", "あめりかしゅっしんです。", {
    dialect: "standard",
    ttsSource: "reading",
  });
  assert(
    tts != null && (tts.includes("シュッシン") || tts.includes("しゅっしん")),
    "reading source uses normalized kana path"
  );
}

console.log("\n=== Script source modes ===\n");

{
  const surface = getTtsTextFromFields("アメリカ出身です。", "あめりかしゅっしんです。", {
    dialect: "standard",
    ttsSource: "surface",
  });
  assert(surface === "アメリカ出身です。", `surface mode: "${surface}"`);

  const reading = getTtsTextFromFields("アメリカ出身です。", "あめりかしゅっしんです。", {
    dialect: "standard",
    ttsSource: "reading",
  });
  assert(reading !== surface, "reading mode differs from surface");
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) process.exit(1);
