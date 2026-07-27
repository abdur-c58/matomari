/**
 * Ask GPT-5.4 for an improved standard-dialect translation prompt section.
 * Writes suggestions to _en_scan_chunks/prompt-upgrade-suggestion.json
 *
 * Usage: npx tsx --env-file=.env.local scripts/improve-translation-prompt.ts
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "_en_scan_chunks", "prompt-upgrade-suggestion.json");
const MODEL = process.env.OPENAI_REVIEW_MODEL?.trim() || "gpt-5.4";

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

const CURRENT_STANDARD_BLOCK = `DIALECT: Standard Japanese (hyōjungo)
- Tokyo-based neutral Japanese understandable nationwide
- Avoid regional dialect markers unless the English clearly calls for them

PHILOSOPHY:
- Prefer natural spoken Japanese over textbook-stiff phrasing
- Match the register field exactly: casual = plain/informal, polite = です/ます, formal = keigo where appropriate
- Use category, subtopic, tags, and context_notes for situational tone
- If english contains multiple sentences, translate them as ONE study unit — preserve the same number and flow of sentences in japanese, reading, and romaji
- For standard dialect, the TTS engine speaks directly from the japanese kanji/kana surface form (it handles pitch accent and intonation correctly from kanji) — reading is the authoritative pronunciation guide for learners and the kana fallback when a surface form can't be used (placeholders, mixed scripts). It must be 100% kana (hiragana/katakana), never kanji, and must reflect every reading choice in japanese exactly — correct pitch accent, compound verbs, rendaku, and particle は→わ / へ→え where spoken
- Keep loanwords in katakana in reading (アメリカ not あめりか). For sokuon clusters (しゅっしん, がっこう), write them precisely — small ゅ/ょ and っ are required
- Use Japanese punctuation in reading for natural delivery: 、 before a trailing exasperated もう/ね, ？ for questions, ！ for emphasis. Example: くうきよんでよ、もう。
- For emotionally loaded lines (frustration, sighing もう, exasperation), put the comma BEFORE the emotional tail so TTS can pause — e.g. NOT くうきよんでよもう。

PLACEHOLDERS (template blanks):
- If English or context_notes indicate a fill-in blank (e.g. learner's own name, location, time):
  - Use [tag] syntax in japanese, english, and romaji (e.g. [name], [place]) — never use ___ or underscores in any field
  - reading must be 100% kana with NO brackets — use a natural spoken substitute at each position (e.g. なまえ for [name])
  - Include placeholders array on each translation that needs it:
    { "tag": "name", "resolveAs": "learner", "readingSubstitute": "なまえ" }
  - resolveAs "learner" when [name] refers to the studying user (including narrative, possessive, and multi-clause sentences — not only self-introductions); "literal" when the blank is someone else's name or a generic slot
  - Repeat [name] in japanese/reading substitutes at every occurrence; use the same readingSubstitute each time unless context requires a different spoken form (e.g. possessive)`;

async function main() {
  loadEnvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You improve English→Japanese translation prompts for a Japanese learning app (Matomari).
Return JSON: { "standardDialectBlock": "...", "philosophyAdditions": "...", "domainRules": "...", "mergedStandardInstructions": "...", "notes": "..." }

mergedStandardInstructions must be a drop-in replacement for the STANDARD dialect + PHILOSOPHY guidance (not JSON schema, not Kansai, not PLACEHOLDERS section which we keep). Keep it concise but sharper than the current prompt. Preserve reading/TTS constraints.`,
      },
      {
        role: "user",
        content: `App context:
- Casual-first language learning app for English speakers learning Japanese
- Each seed includes: id, english, register (casual|polite|formal), difficulty, category (folder), subtopic, tags[], optional context_notes
- Scene titles/folders include travel, airports, hotels, restaurants, shopping, work, daily life, etc.
- TTS for standard dialect reads the japanese kanji/kana surface; reading must be 100% kana
- [name] placeholders are intentional personalization

Known failure:
English: "Your gate is at the far end of the concourse"
Bad: 「あなたのゲートはコンコースの一番奥にあります。」
Better: 「搭乗口はコンコースの一番奥にあります。」
Issues: unnecessary あなた; literal ゲート instead of airport 搭乗口

Current STANDARD + PHILOSOPHY (before PLACEHOLDERS):
${CURRENT_STANDARD_BLOCK}

Write improved STANDARD dialect + PHILOSOPHY text that:
1. Forces domain-native vocabulary using category/subtopic (airport gate→搭乗口; hotel/shop situational terms)
2. Tells the model to omit あなた/きみ unless needed for clarity/contrast
3. Prefers natural spoken Japanese over EN word-order calques and unnecessary loanwords when a native Japanese term is standard in that setting
4. Still matches register exactly
5. Keep reading/TTS rules from the current prompt
6. Include 1–2 short good/bad examples (gate + maybe one pronoun drop)`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response");
  const parsed = JSON.parse(raw);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify({ model: MODEL, updatedAt: new Date().toISOString(), ...parsed }, null, 2)
  );
  console.log("Wrote", OUT);
  console.log("--- mergedStandardInstructions ---");
  console.log(parsed.mergedStandardInstructions ?? parsed.standardDialectBlock);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
