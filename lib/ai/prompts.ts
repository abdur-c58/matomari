import type { DatasetSummary, TutorContext } from "./types";
import { APP_NAME } from "@/lib/constants/branding";

const METHOD_SUMMARY = `${APP_NAME} is a Japanese learning app using a three-step method:
1. Batch learning (~20-25 sentences from a pathway or language island)
2. Listen & shadow at native speed after confirming meanings
3. Active recall from English prompts with honest self-rating (1-5 stars)
Sentences retire from the active batch at 4+ stars and enter spaced repetition review.`;

/**
 * Shared rules for AI-generated study sentences (islands, translation, review).
 * One sentences[] entry = one study card; english may hold multiple sentences when natural.
 */
export const STUDY_SENTENCE_SHAPE_RULES = `STUDY UNIT SHAPE:
- Each entry in a sentences array is ONE study unit (one card in the app).
- The english field may contain multiple sentences when they form a natural mini-unit (e.g. a remark and a closely related follow-up, or a situation plus a natural reaction). Separate sentences with ". " and use normal punctuation.
- Do not merge unrelated lines to reduce count. Do not split a natural pair into separate entries when learners would study them together.
- Keep each unit concise and speakable in one shadowing pass — typically one or two short sentences, not a paragraph.

LEARNER PERSONALIZATION ([name]):
- When personalization fits the theme or situation, use [name] in english for the learner's own name — not only introductions, but also possessions, experiences, stories, apologies, requests, and other natural contexts at the target level.
- [name] may appear once or multiple times per unit, in any grammatical role (subject, possessive, object, etc.). Vary phrasing across the set; avoid repeating the same [name] template.
- Use [name] only where it genuinely improves usefulness — most sentences in a set should not use it. Never use ___ or underscores; always [name].`;

export function buildTutorSystemPrompt(
  context: TutorContext,
  summary: DatasetSummary
): string {
  const parts = [
    `You are a helpful Japanese language tutor for the ${APP_NAME} app.`,
    METHOD_SUMMARY,
    `Answer in clear English. Include Japanese with reading when helpful.`,
    `Use Markdown for readability: **bold** for key terms, bullet lists for steps, \`inline code\` for Japanese fragments, and short headings when comparing options.`,
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
      ...(s.japanese?.trim() ? { japanese: s.japanese.trim() } : {}),
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
2. For reusedIds: list catalog ids in reusedIds AND in sentences use ONLY {"id": "existing-id"} — no other fields.
3. For NEW sentences: include ALL fields (english, register, difficulty, category, subtopic, tags). English only — no japanese/reading/romaji. Use id pattern "{islandKey}-001", etc.
4. Set translated: false on all new sentences.
5. NO duplicate english text within the island.
6. NO duplicate ids within the island.
7. When reusing catalog sentences, do NOT reuse two entries with the same japanese translation.
8. Prefer reusing 20-40% of catalog entries when they fit the theme AND match the target level.
9. New English sentences must be practical, natural phrases for the theme at the target level.
10. subtopics array should list all subtopics used in sentences.
11. Match grammar complexity, sentence length, and vocabulary to the target level — do not exceed it.

${STUDY_SENTENCE_SHAPE_RULES}`;
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

GOAL: Sound like a native Osaka/Kyoto speaker at the given register — not Tokyo Japanese with a few regional words sprinkled on, and not "costume Kansai" that forces やねん/へん where a native would speak standard polite Japanese.

REGISTER (this is the main lever):
- polite / formal: Keep です・ます (or soft keigo). Kansai and polite hyōjungo overlap heavily — a native speaking politely to a stranger often sounds Kansai through rhythm, particles, and small choices (e.g. そうですか → そうなんですか), NOT through constant やねん/やで/ちゃう. Do not force Kansai endings where native speakers would use standard polite forms.
- casual: Fuller Osaka-ben is appropriate — へん/ひん, ちゃう, や/やで, すん, なんでや, ほんま, めっちゃ, 〜やねん, etc. when natural.
- Match the register field exactly. Never drop です/ます on a polite line to sound "more Kansai."

japanese (display text):
- Write natural Kansai Japanese at the correct register.
- For polite lines, valid Kansai polite forms are often close to standard (e.g. そうなんですか。 for "Oh, is that so?") — that IS Kansai, not a failure to dialectize.
- For casual lines, prefer real Osaka-ben phrasing over hyōjungo when it fits the English.
- Do not add filler ああ/あー unless the English has a clear separate interjection and it sounds natural at that register.

reading:
- Kana-only (hiragana/katakana, no kanji) pronunciation of japanese as written.
- Must match japanese exactly in meaning and structure.

phonetic_reading (REQUIRED — used for Kansai TTS audio):
- MUST preserve the exact meaning, politeness level, and sentence type of japanese. A question stays a question (？); a statement stays a statement. Do not rewrite into a different sentence.
- Adjust pronunciation and spoken surface forms only — how the same line SOUNDS in Osaka-ben, not what a different line would say.
- Allowed adjustments when natural at that register:
  - ない → へん/ひん (casual)
  - じゃない → ちゃう (casual)
  - だ → や (casual)
  - する → すん (casual)
  - ほんとう → ほんま
  - particle は → わ, へ → え
  - polite ん before です (そうですか → そうなんですか)
- Forbidden: changing sentence type (question → assertion), dropping politeness, swapping vocabulary that alters meaning (e.g. そんなこと → そないこと + するの？ → すんねん！ on the same line), or casual rewrite of a polite japanese line.
- For polite です/ます lines: phonetic_reading may equal reading when the spoken form is already natural — subtle ん / particle cues only.
- Must be 100% kana — no kanji, no IPA.

Examples:
- polite reaction "Oh, is that so?":
  japanese「そうなんですか。」reading「そうなんですか。」phonetic_reading「そうなんですか。」
- casual question (preserve question):
  japanese「なんでそんなことするの？」reading「なんでそんなことするの？」phonetic_reading「なんでそんなことすんの？」
- casual negative:
  japanese「わかりません。」reading「わかりません。」phonetic_reading「わかりへん。」(only if japanese itself uses casual Kansai form)

romaji:
- Latin transliteration of how phonetic_reading SOUNDS in Osaka-ben — not a hyōjungo reading of kanji.`
      : `DIALECT: Standard Japanese (hyōjungo)
- Use neutral Tokyo-based standard Japanese that sounds natural nationwide
- Avoid regional dialect features unless the English explicitly requires them`;

  const kansaiFields =
    dialect === "kansai"
      ? `,
      "phonetic_reading": "KANSAI TTS SCRIPT — kana-only spoken Osaka-ben form of japanese; same meaning, sentence type, and register; pronunciation adjustments only"`
      : "";

  const philosophyBlock =
    dialect === "kansai"
      ? `PHILOSOPHY:
- Prefer natural spoken Japanese over textbook-stiff phrasing
- Match the register field exactly: casual = plain/informal, polite = です/ます, formal = keigo where appropriate
- Use category, subtopic, tags, and context_notes for situational tone
- If english contains multiple sentences, translate them as ONE study unit — preserve the same number and flow of sentences in japanese, reading, and romaji
- Keep loanwords in katakana in reading (アメリカ not あめりか). For sokuon clusters (しゅっしん, がっこう), write them precisely — small ゅ/ょ and っ are required
- Use Japanese punctuation in reading for natural delivery: 、 before a trailing exasperated もう/ね, ？ for questions, ！ for emphasis. Example: くうきよんでよ、もう。
- For emotionally loaded lines (frustration, sighing もう, exasperation), put the comma BEFORE the emotional tail so TTS can pause — e.g. NOT くうきよんでよもう。`
      : `PHILOSOPHY:
- Translate into natural spoken Japanese for the stated situation, not English-shaped Japanese
- Match the register field exactly: casual = plain/informal, polite = です/ます, formal = keigo when appropriate
- Use category, subtopic, tags, and context_notes as real constraints to pick domain-native vocabulary and phrasing. Prefer the term actually used in that setting (e.g. airport 搭乗口, hotel フロント, restaurant お会計, station 改札)
- Omit explicit subjects/pronouns like あなた / きみ unless needed for clarity, contrast, or emphasis
- Prefer standard Japanese terms over unnecessary loanwords when a native term is more natural in context; use loanwords when they are the normal Japanese term
- Restructure freely to sound idiomatic Japanese; avoid literal word-order calques, stiff textbook phrasing, and over-literal possessives
- If english contains multiple sentences, translate them as ONE study unit — preserve the same number and flow of sentences in japanese, reading, and romaji
- For standard dialect, the TTS engine speaks directly from the japanese kanji/kana surface form. Reading is the authoritative pronunciation guide for learners and the kana fallback when a surface form can't be used (placeholders, mixed scripts). Reading must be 100% kana (hiragana/katakana), never kanji, and must reflect every reading choice in japanese exactly — including compound readings, rendaku, and spoken particles は→わ / へ→え
- Keep loanwords in katakana in reading (アメリカ not あめりか). Write sokuon and small kana precisely (e.g. しゅっしん, がっこう)
- Use Japanese punctuation in reading for natural delivery: 、 before a trailing emotional tail like もう/ね, ？ for questions, ！ for emphasis. Example: くうきよんでよ、もう。
- For emotionally loaded lines, put the comma before the emotional tail so TTS pauses correctly — e.g. NOT くうきよんでよもう。
- Examples:
  - Bad: あなたのゲートはコンコースの一番奥にあります。 → Good: 搭乗口はコンコースの一番奥にあります。
  - Bad: あなたは先に行って。 → Good: 先に行って。`;

  return `Translate these English sentences into natural Japanese for a casual-first language learning app.

${dialectBlock}

${philosophyBlock}

PLACEHOLDERS (template blanks):
- If English or context_notes indicate a fill-in blank (e.g. learner's own name, location, time):
  - Use [tag] syntax in japanese, english, and romaji (e.g. [name], [place]) — never use ___ or underscores in any field
  - reading must be 100% kana with NO brackets — use a natural spoken substitute at each position (e.g. なまえ for [name])
  - Include placeholders array on each translation that needs it:
    { "tag": "name", "resolveAs": "learner", "readingSubstitute": "なまえ" }
  - resolveAs "learner" when [name] refers to the studying user (including narrative, possessive, and multi-clause sentences — not only self-introductions); "literal" when the blank is someone else's name or a generic slot
  - Repeat [name] in japanese/reading substitutes at every occurrence; use the same readingSubstitute each time unless context requires a different spoken form (e.g. possessive)
  - For Kansai, phonetic_reading must also use kana substitutes (no brackets), matching placeholder positions

Return valid JSON only:
{
  "translations": {
    "<sentence-id>": {
      "japanese": "natural Japanese",
      "reading": "HIRAGANA/KATAKANA ONLY — full pronunciation of japanese with ZERO kanji. Must match how japanese is spoken exactly. Use katakana for loanwords.",
      "romaji": "romaji",
      "literal_note": "optional — only if natural meaning diverges from literal read",
      "placeholders": "optional — array of { tag, resolveAs, readingSubstitute, label? } when japanese uses [tags]"${kansaiFields}
    }
  }
}

Include an entry for EVERY sentence id below. Omit literal_note unless genuinely useful.

SENTENCES:
${JSON.stringify(sentences, null, 2)}`;
}

export function buildTranscriptSegmentPrompt(
  transcript: string,
  maxSentences: number
): string {
  return `You analyze Japanese transcripts (YouTube subtitles, podcast notes, etc.) for a language-learning app.

TASK:
1. Read the full transcript below.
2. Pick ${maxSentences} or fewer high-value study sentences — NOT every line.
3. Skip filler (うん, えーと), repeated lines, fragments too short to study alone, and near-duplicates.
4. Prefer lines with useful grammar, vocabulary, natural spoken phrasing, or emotional/colorful expressions.
5. Keep each japanese excerpt faithful to the transcript wording (light trimming OK; do not rewrite into textbook Japanese).
6. Provide a clear English gloss for each line.
7. Suggest a short island name and description summarizing the content/situation.

For each sentence:
- japanese: the study line as it appears (or naturally trimmed) in the transcript
- english: natural English meaning for the learner; may be multiple sentences in one entry when the excerpt is a natural mini-unit
- reading: kana-only pronunciation guide for TTS — hiragana/katakana ONLY, no kanji; match spoken delivery
- romaji: optional romaji
- register: casual | polite | formal — match how it is spoken
- context_notes: optional one-line situational note
- reason: one short sentence explaining why this line is worth studying (shown in UI only)

Return valid JSON only:
{
  "suggestedName": "short island name, 2-6 words",
  "description": "1-2 sentences describing the transcript topic/situation",
  "sentences": [
    {
      "japanese": "...",
      "english": "...",
      "reading": "...",
      "romaji": "...",
      "register": "casual",
      "context_notes": "optional",
      "reason": "..."
    }
  ]
}

TRANSCRIPT:
${transcript}`;
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

${STUDY_SENTENCE_SHAPE_RULES}

${context ? `${context}\n` : ""}
SENTENCE:
"${input.english}"

Return JSON only:
{
  "correctedEnglish": "grammar-corrected version; preserve multiple sentences when they form one natural study unit; if already fine, return the original unchanged",
  "grammarNotes": ["0-2 brief bullets on grammar fixes, or empty if none"],
  "toneQuestions": ["0-2 short questions ONLY if tone/register/situation is ambiguous — e.g. 'Is this spoken to a friend or coworker?'"],
  "suggestedRegister": "casual" | "polite" | "formal",
  "suggestedContextNotes": "optional one-line situational note for the translator, or omit",
  "hasIssues": true if grammar or clarity needs attention, else false
}

Be concise. Skip toneQuestions when the sentence is clear. Do not over-correct natural spoken English.`;
}

export function buildSentenceIntentPrompt(input: {
  english: string;
  islandName?: string;
  register?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}): string {
  const history =
    input.conversationHistory?.length ?
      `\nPRIOR CLARIFICATION:\n${input.conversationHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}\n`
    : "";

  const context = [
    input.islandName ? `Island theme: ${input.islandName}` : null,
    input.register ? `Preferred register if known: ${input.register}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You help a Japanese learner add a custom English sentence to their study island.

${STUDY_SENTENCE_SHAPE_RULES}

Decide whether the meaning is clear enough to translate to Japanese, or whether you need ONE short clarification question.

${context ? `${context}\n` : ""}${history}
CURRENT INPUT:
"${input.english}"

Return JSON only:
{
  "status": "ready" | "clarify",
  "question": "only when status is clarify — one short question",
  "refinedEnglish": "when status is ready — clean English to translate; may include multiple sentences when the learner input is one natural study unit",
  "suggestedRegister": "casual" | "polite" | "formal",
  "suggestedContextNotes": "optional one-line note for translator"
}

Rules:
- Use "ready" when the intended meaning is clear from the text alone (plus any clarification history).
- Use "clarify" ONLY when multiple plausible meanings exist and context is insufficient.
- Do not ask about register if the sentence already implies it clearly.
- Do not hardcode rules about specific words — judge ambiguity from meaning and context.
- Minimize interruptions: prefer "ready" when a reasonable default interpretation exists.
- If clarifying, ask exactly one focused question under 120 characters.`;
}

export function buildNameTranslationPrompt(name: string): string {
  return `Convert this personal name into the standard Japanese katakana form used when introducing yourself in Japan.

Name: "${name}"

Rules:
- Return katakana only (no kanji, no Latin letters, no spaces)
- Use the most natural Japanese pronunciation for this name (loanword style)
- For Japanese native names already in kana, return them in katakana or hiragana as commonly spoken for introductions
- Do not add honorifics (さん, くん, etc.)

Return JSON only:
{
  "kana": "カタカナのみ"
}`;
}
