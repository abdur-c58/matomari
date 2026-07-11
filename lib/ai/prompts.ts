import type { DatasetSummary, TutorContext } from "./types";
import { APP_NAME } from "@/lib/constants/branding";

const METHOD_SUMMARY = `${APP_NAME} is a Japanese learning app using a three-step method:
1. Batch learning (~20-25 sentences from a pathway or language island)
2. Listen & shadow at native speed after confirming meanings
3. Active recall from English prompts with honest self-rating (1-5 stars)
Sentences retire from the active batch at 4+ stars and enter spaced repetition review.`;

export function buildTutorSystemPrompt(
  context: TutorContext,
  summary: DatasetSummary
): string {
  const parts = [
    `You are a helpful Japanese language tutor for the ${APP_NAME} app.`,
    METHOD_SUMMARY,
    `Answer in clear English. Include Japanese with reading when helpful.`,
    `Be concise and practical. Do not invent sentences not in the user's dataset when discussing specific content.`,
    ``,
    `Dataset: ${summary.sentenceCount} sentences across islands: ${summary.islandKeys.join(", ") || "none"}.`,
  ];

  if (context.type === "sentence" && summary.focusSentence) {
    const s = summary.focusSentence;
    parts.push(
      ``,
      `The user is asking about this specific sentence:`,
      `- ID: ${s.id}`,
      `- English: ${s.english}`,
      `- Register: ${s.register}, Difficulty: ${s.difficulty}`,
      `- Category: ${s.category}, Subtopic: ${s.subtopic}`,
      `- Tags: ${s.tags.join(", ")}`,
      s.context_notes ? `- Context notes: ${s.context_notes}` : "",
      s.translated === false && !s.japanese
        ? `- Status: not yet translated (Japanese not available)`
        : "",
      s.japanese ? `- Japanese: ${s.japanese}` : "",
      s.reading ? `- Reading: ${s.reading}` : "",
      s.romaji ? `- Romaji: ${s.romaji}` : "",
      s.literal_note ? `- Literal note: ${s.literal_note}` : "",
      s.rating != null ? `- User rating: ${s.rating}/5 stars` : "",
      s.meaningConfirmed != null
        ? `- Meaning confirmed: ${s.meaningConfirmed ? "yes" : "no"}`
        : ""
    );
  }

  if (context.type === "island" && summary.focusIsland) {
    const island = summary.focusIsland;
    parts.push(
      ``,
      `The user is asking about the "${island.key}" language island.`,
      `Description: ${island.description}`,
      `Subtopics: ${island.subtopics.join(", ")}`,
      `Sentences in this island (${island.sentences.length}):`,
      ...island.sentences.slice(0, 40).map((s) =>
        s.japanese
          ? `  - [${s.id}] ${s.japanese} — ${s.english}`
          : `  - [${s.id}] ${s.english} (not yet translated)`
      )
    );
    if (island.sentences.length > 40) {
      parts.push(`  ... and ${island.sentences.length - 40} more`);
    }
  }

  return parts.filter(Boolean).join("\n");
}

export function buildIslandGenerationPrompt(
  theme: string,
  sentenceCount: number,
  difficultyRange: [number, number],
  catalog: Array<{
    id: string;
    english: string;
    difficulty: number;
    category: string;
    japanese?: string;
  }>,
  options?: {
    levelDescription: string;
    extraInstructions?: string;
  }
): string {
  const catalogJson = JSON.stringify(
    catalog.slice(0, 200).map((s) => ({
      id: s.id,
      english: s.english,
      difficulty: s.difficulty,
      category: s.category,
      hasJapanese: Boolean(s.japanese?.trim()),
    }))
  );

  const extraBlock = options?.extraInstructions?.trim()
    ? `\nUSER PREFERENCES (follow closely):\n${options.extraInstructions.trim()}\n`
    : "";

  return `Generate a language island for the ${APP_NAME} Japanese learning app.

Theme: "${theme}"
Target sentence count: ${sentenceCount}
Target level: ${options?.levelDescription ?? "Intermediate fluency"}
Difficulty range: ${difficultyRange[0]} to ${difficultyRange[1]} (1=easiest, 5=hardest)
${extraBlock}
EXISTING SENTENCE CATALOG (reuse by exact id when thematically appropriate):
${catalogJson || "[]"}

RULES:
1. Return valid JSON only with this shape:
{
  "islandKey": "snake_case_slug",
  "description": "string",
  "subtopics": ["string"],
  "reusedIds": ["existing-id"],
  "sentences": [
    {
      "id": "string",
      "english": "string",
      "register": "casual" | "polite" | "formal",
      "difficulty": number,
      "category": "string",
      "subtopic": "string",
      "tags": ["string"],
      "context_notes": "optional string",
      "translated": false
    }
  ]
}
2. For reusedIds: include ONLY {"id": "existing-id"} in sentences — they will be resolved from catalog.
3. For NEW sentences: English only — do NOT include japanese/reading/romaji. Use id pattern "{islandKey}-001", etc.
4. Set translated: false on all new sentences.
5. NO duplicate english text within the island.
6. NO duplicate ids within the island.
7. Prefer reusing 20-40% of catalog entries when they fit the theme AND match the target level.
8. New English sentences must be practical, natural phrases for the theme at the target level.
9. subtopics array should list all subtopics used in sentences.
10. Match grammar complexity, sentence length, and vocabulary to the target level — do not exceed it.`;
}

export function buildIslandSuggestionsPrompt(input: {
  existingIslandKeys: string[];
  pathwayBatchTitles: string[];
  pathwaySubtopics: string[];
}): string {
  return `Suggest language island themes for the ${APP_NAME} Japanese learning app.

The user has a main pathway (core curriculum) and optional topic islands (~20–75 situational sentence sets).

EXISTING ISLANDS (do not duplicate these themes):
${input.existingIslandKeys.length ? input.existingIslandKeys.map((k) => `- ${k.replace(/_/g, " ")}`).join("\n") : "- none yet"}

MAIN PATHWAY BATCH TITLES (for context on what they are learning):
${input.pathwayBatchTitles.slice(0, 15).map((t) => `- ${t}`).join("\n") || "- none"}

PATHWAY SUBTOPICS COVERED:
${[...new Set(input.pathwaySubtopics)].slice(0, 30).join(", ") || "various"}

Return valid JSON only:
{
  "suggestions": [
    { "theme": "short theme label for input field, e.g. izakaya ordering", "reason": "one sentence why this fits now" }
  ]
}

RULES:
1. Suggest 6 practical, distinct island themes a learner would want AFTER pathway basics.
2. Mix everyday life, travel, work, social, and niche situational topics.
3. Themes should complement (not repeat) existing islands and pathway subtopics.
4. Keep theme strings concise (2–6 words) — they will be passed directly to island generation.
5. Reasons should be friendly and specific, under 120 characters each.`;
}

export function buildTranslationPrompt(
  sentences: Array<{
    id: string;
    english: string;
    register: string;
    difficulty: number;
    category: string;
    subtopic: string;
    tags: string[];
    context_notes?: string;
  }>,
  dialect: "standard" | "kansai" = "standard"
): string {
  const dialectBlock =
    dialect === "kansai"
      ? `DIALECT: Kansai (Osaka/Kyoto ben)
- Use natural Kansai Japanese, not standard hyōjungo with a few regional words sprinkled in
- Prefer common Kansai patterns where they fit: へん/ひん, せえへん, ちゃう, おる, なんでや, ほんま, あかん, めっちゃ, 〜やねん, 〜やで, 〜へん?, etc. as appropriate to register
- Keep the register field in mind — casual Kansai fits casual; polite lines can use softer Kansai-business tone without full keigo breakdown
- reading must reflect Kansai pronunciation (e.g. ない → へん/ひん readings where spoken that way)`
      : `DIALECT: Standard Japanese (hyōjungo)
- Tokyo-based neutral Japanese understandable nationwide
- Avoid regional dialect markers unless the English clearly calls for them`;

  return `Translate these English sentences into natural Japanese for a casual-first language learning app.

${dialectBlock}

PHILOSOPHY:
- Prefer natural spoken Japanese over textbook-stiff phrasing
- Match the register field exactly: casual = plain/informal, polite = です/ます, formal = keigo where appropriate
- Use category, subtopic, tags, and context_notes for situational tone
- The reading field is the authoritative pronunciation guide for TTS — it must be 100% kana (hiragana/katakana), never kanji, and must reflect every reading choice in japanese (including compound verbs, rendaku, and particle は→わ / へ→え where spoken)
- Use Japanese punctuation in reading for natural delivery: 、 before a trailing exasperated もう/ね, ？ for questions, ！ for emphasis. Example: くうきよんでよ、もう。
- For emotionally loaded lines (frustration, sighing もう, exasperation), put the comma BEFORE the emotional tail so TTS can pause — e.g. NOT くうきよんでよもう。

Return valid JSON only:
{
  "translations": {
    "<sentence-id>": {
      "japanese": "natural Japanese",
      "reading": "HIRAGANA/KATAKANA ONLY — full pronunciation of japanese with ZERO kanji. Must match how japanese is spoken exactly. Use katakana for loanwords.",
      "romaji": "romaji",
      "literal_note": "optional — only if natural meaning diverges from literal read"
    }
  }
}

Include an entry for EVERY sentence id below. Omit literal_note unless genuinely useful.

SENTENCES:
${JSON.stringify(sentences, null, 2)}`;
}

export function buildSentenceReviewPrompt(input: {
  english: string;
  register?: string;
  contextNotes?: string;
  islandName?: string;
}): string {
  const context = [
    input.islandName ? `Island theme: ${input.islandName}` : null,
    input.register ? `User-selected register: ${input.register}` : null,
    input.contextNotes ? `User context notes: ${input.contextNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Review this English sentence for a Japanese language-learning app. The learner will translate it to Japanese later.

${context ? `${context}\n` : ""}
SENTENCE:
"${input.english}"

Return JSON only:
{
  "correctedEnglish": "grammar-corrected version; if already fine, return the original unchanged",
  "grammarNotes": ["0-2 brief bullets on grammar fixes, or empty if none"],
  "toneQuestions": ["0-2 short questions ONLY if tone/register/situation is ambiguous — e.g. 'Is this spoken to a friend or coworker?'"],
  "suggestedRegister": "casual" | "polite" | "formal",
  "suggestedContextNotes": "optional one-line situational note for the translator, or omit",
  "hasIssues": true if grammar or clarity needs attention, else false
}

Be concise. Skip toneQuestions when the sentence is clear. Do not over-correct natural spoken English.`;
}
