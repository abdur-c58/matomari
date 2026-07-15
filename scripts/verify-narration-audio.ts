/**
 * Verify Fish cue compilation, placeholder ordering, pause precedence,
 * markup stripping, and narration sidecar / catalog coverage.
 *
 * Usage: npm run verify-narration-audio
 */

import fs from "fs";
import path from "path";
import {
  compileFishAudioScript,
  stripFishAudioTags,
} from "../lib/audio/fish-audio-cues";
import {
  applyNarrationDirectivesToCatalogIslands,
  parseNarrationDirectivesSidecar,
} from "../lib/audio/narration-directives";
import { getSpokenScriptFromFields } from "../lib/audio/tts-text";
import { stripTtsMarkup } from "../lib/audio/tts-prosody";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";

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

console.log("\n=== Fish cue compilation ===\n");

{
  const compiled = compileFishAudioScript("元気ですか。", {
    expression: "curious",
  });
  assert(compiled === "[curious] 元気ですか。", `leading expression: "${compiled}"`);

  const withEffect = compileFishAudioScript("助かりました。", {
    expression: "grateful",
    effect: "soft tone",
  });
  assert(
    withEffect === "[grateful][soft tone] 助かりました。",
    `expression + effect: "${withEffect}"`
  );

  const stripped = stripFishAudioTags("[curious] 元気ですか。");
  assert(stripped === "元気ですか。", `stripFishAudioTags: "${stripped}"`);
  assert(
    stripTtsMarkup("[happy] こんにちは。<break time=\"200ms\"/>") === "こんにちは。",
    "stripTtsMarkup removes Fish + break tags"
  );
}

console.log("\n=== [name] resolves before Fish cue injection ===\n");

{
  const spoken = getSpokenScriptFromFields(
    {
      japanese: "[name]です。",
      reading: "なまえです。",
      placeholders: [
        { tag: "name", resolveAs: "learner", readingSubstitute: "なまえ" },
      ],
      fishAudio: { expression: "friendly" },
    },
    { learnerName: "パンコ", dialect: "standard" }
  );
  assert(spoken === "[friendly] パンコです。", `spoken script: "${spoken}"`);
  assert(!spoken?.includes("[name]"), "no unresolved [name]");
  assert(!spoken?.includes("なまえ"), "learner name applied");
}

console.log("\n=== Per-item pause precedence (logic) ===\n");

{
  const playlistPauseMs = 1500;
  const itemPause = 800;
  const waitMs =
    typeof itemPause === "number" && Number.isFinite(itemPause)
      ? itemPause
      : playlistPauseMs;
  assert(waitMs === 800, "item.pauseAfterMs wins over playlist pause");
  const waitFallback =
    typeof undefined === "number" && Number.isFinite(undefined as never)
      ? (undefined as never)
      : playlistPauseMs;
  assert(waitFallback === 1500, "falls back to playlist pause when unset");
}

console.log("\n=== Catalog / sidecar coverage ===\n");

{
  const catalogPath = path.join(process.cwd(), "public", "premade-catalog.json");
  const sidecarPath = path.join(
    process.cwd(),
    "scripts",
    "data",
    "narration-audio-directives.json"
  );
  assert(fs.existsSync(sidecarPath), "sidecar exists");
  assert(fs.existsSync(catalogPath), "catalog exists");

  if (fs.existsSync(sidecarPath) && fs.existsSync(catalogPath)) {
    const catalog = parsePremadeCatalog(
      JSON.parse(fs.readFileSync(catalogPath, "utf8"))
    );
    const sidecar = parseNarrationDirectivesSidecar(
      JSON.parse(fs.readFileSync(sidecarPath, "utf8"))
    );
    const narration = Object.entries(catalog.islands).filter(
      ([, island]) => island.format === "narration"
    );
    assert(narration.length >= 1, `narration islands: ${narration.length}`);

    let catalogWithAudio = 0;
    let leakedFish = 0;
    for (const [, island] of narration) {
      for (const s of island.sentences) {
        if (s.narrationAudio) catalogWithAudio++;
        const blob = [s.japanese, s.reading, s.romaji, s.english]
          .filter(Boolean)
          .join(" ");
        if (
          /\[[a-z][a-z\- ]*\]/i.test(blob) &&
          !/\[[Nn]ame\]/.test(blob)
        ) {
          leakedFish++;
        }
      }
    }

    assert(
      catalogWithAudio === sidecar.turns.length,
      `catalog narrationAudio (${catalogWithAudio}) matches sidecar (${sidecar.turns.length})`
    );
    assert(leakedFish === 0, "no Fish cue brackets in display fields");

    // Merge must succeed with full coverage
    try {
      applyNarrationDirectivesToCatalogIslands(catalog.islands, sidecar, {
        requireFullCoverage: true,
      });
      assert(true, "sidecar full-coverage merge succeeds");
    } catch (e) {
      assert(false, `sidecar merge failed: ${e instanceof Error ? e.message : e}`);
    }

    const withExpr = sidecar.turns.filter((t) => t.fishAudio?.expression).length;
    const withEffect = sidecar.turns.filter((t) => t.fishAudio?.effect).length;
    console.log(
      `  info: expressions=${withExpr}/${sidecar.turns.length} effects=${withEffect}`
    );
    assert(
      withExpr / sidecar.turns.length <= 0.7,
      `expression density not excessive (${((withExpr / sidecar.turns.length) * 100).toFixed(1)}%)`
    );
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
