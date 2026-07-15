export type IslandLevelMode = "fluency" | "jlpt";

export type IslandFluencyLevel =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export type IslandJlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/** matched = constrain to learner level; natural = any difficulty that fits. */
export type IslandDifficultyMode = "matched" | "natural";

export type IslandDurationTier = "quick" | "standard" | "deep";

export type IslandGenerationFormat = "standard" | "narration";

export const DEFAULT_ISLAND_LEVEL_MODE: IslandLevelMode = "fluency";
export const DEFAULT_ISLAND_FLUENCY_LEVEL: IslandFluencyLevel = "intermediate";
export const DEFAULT_ISLAND_JLPT_LEVEL: IslandJlptLevel = "N4";
export const DEFAULT_ISLAND_DIFFICULTY_MODE: IslandDifficultyMode = "matched";
export const DEFAULT_ISLAND_DURATION_TIER: IslandDurationTier = "standard";
export const DEFAULT_ISLAND_GENERATION_FORMAT: IslandGenerationFormat = "standard";

/** Approximate duration tiers → flexible target sentence counts for AI generation. */
export const ISLAND_DURATION_TIERS: {
  value: IslandDurationTier;
  label: string;
  durationLabel: string;
  sentenceRangeLabel: string;
  targetCount: number;
  softMin: number;
  softMax: number;
}[] = [
  {
    value: "quick",
    label: "Quick",
    durationLabel: "~2–3 min",
    sentenceRangeLabel: "~8–12",
    targetCount: 10,
    softMin: 6,
    softMax: 14,
  },
  {
    value: "standard",
    label: "Standard",
    durationLabel: "~5–7 min",
    sentenceRangeLabel: "~20–25",
    targetCount: 22,
    softMin: 16,
    softMax: 30,
  },
  {
    value: "deep",
    label: "Deep dive",
    durationLabel: "~10–15 min",
    sentenceRangeLabel: "~40–50",
    targetCount: 45,
    softMin: 35,
    softMax: 55,
  },
];

export function getIslandDurationTier(tier: IslandDurationTier) {
  return (
    ISLAND_DURATION_TIERS.find((t) => t.value === tier) ??
    ISLAND_DURATION_TIERS.find((t) => t.value === DEFAULT_ISLAND_DURATION_TIER)!
  );
}

export function resolveIslandSentenceTarget(tier: IslandDurationTier): number {
  return getIslandDurationTier(tier).targetCount;
}

export const ISLAND_FLUENCY_OPTIONS: {
  value: IslandFluencyLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Survival phrases, very simple patterns, mostly polite form",
  },
  {
    value: "elementary",
    label: "Elementary",
    description: "Everyday basics with short, predictable sentence shapes",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Natural daily conversation with mixed registers",
  },
  {
    value: "upper_intermediate",
    label: "Upper intermediate",
    description: "Longer sentences, nuance, and less predictable phrasing",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Fluent, idiomatic, and situation-specific Japanese",
  },
];

export const ISLAND_JLPT_OPTIONS: {
  value: IslandJlptLevel;
  label: string;
  description: string;
}[] = [
  { value: "N5", label: "JLPT N5", description: "Foundational grammar and high-frequency words" },
  { value: "N4", label: "JLPT N4", description: "Basic conversation and everyday situations" },
  { value: "N3", label: "JLPT N3", description: "Broader daily-life vocabulary and grammar" },
  { value: "N2", label: "JLPT N2", description: "Complex grammar, news-style and abstract topics" },
  { value: "N1", label: "JLPT N1", description: "Near-native nuance, formal registers, and idioms" },
];

const FLUENCY_DIFFICULTY: Record<IslandFluencyLevel, [number, number]> = {
  beginner: [1, 2],
  elementary: [2, 3],
  intermediate: [3, 4],
  upper_intermediate: [4, 5],
  advanced: [4, 5],
};

const JLPT_DIFFICULTY: Record<IslandJlptLevel, [number, number]> = {
  N5: [1, 2],
  N4: [2, 3],
  N3: [3, 4],
  N2: [4, 5],
  N1: [5, 5],
};

export function resolveIslandDifficultyRange(input: {
  levelMode: IslandLevelMode;
  fluencyLevel: IslandFluencyLevel;
  jlptLevel: IslandJlptLevel;
}): [number, number] {
  return input.levelMode === "jlpt"
    ? JLPT_DIFFICULTY[input.jlptLevel]
    : FLUENCY_DIFFICULTY[input.fluencyLevel];
}

export function formatIslandLevelPrompt(input: {
  levelMode: IslandLevelMode;
  fluencyLevel: IslandFluencyLevel;
  jlptLevel: IslandJlptLevel;
}): string {
  if (input.levelMode === "jlpt") {
    const option = ISLAND_JLPT_OPTIONS.find((o) => o.value === input.jlptLevel);
    return `JLPT ${input.jlptLevel} — ${option?.description ?? "Target this JLPT band for grammar and vocabulary."}`;
  }

  const option = ISLAND_FLUENCY_OPTIONS.find((o) => o.value === input.fluencyLevel);
  return `${option?.label ?? input.fluencyLevel} fluency — ${option?.description ?? "Match this practical speaking level."}`;
}
