import type { PlacementLevel } from "@/types/progress";
import type { IslandFluencyLevel, IslandJlptLevel } from "@/lib/constants/island-generation";

/** First pathway batch to study (not skip) for each self-reported level. */
export const PLACEMENT_STARTING_BATCH: Record<PlacementLevel, number> = {
  brand_new: 1,
  beginner: 2,
  elementary: 4,
  intermediate: 7,
  upper_intermediate: 11,
  advanced: 14,
};

export const PLACEMENT_FLUENCY_OPTIONS: {
  value: PlacementLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "brand_new",
    label: "Brand new",
    description: "I've never studied Japanese, or only know a few words",
  },
  {
    value: "beginner",
    label: "Beginner",
    description: "I know basic greetings and simple phrases",
  },
  {
    value: "elementary",
    label: "Elementary",
    description: "I can handle everyday basics with short sentences",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I can hold simple conversations on familiar topics",
  },
  {
    value: "upper_intermediate",
    label: "Upper intermediate",
    description: "I'm comfortable in most daily situations",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "I'm near-fluent and want refinement, not basics",
  },
];

export const PLACEMENT_JLPT_OPTIONS: {
  value: PlacementLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "JLPT N5",
    description: "Foundational grammar and high-frequency words",
  },
  {
    value: "elementary",
    label: "JLPT N4",
    description: "Basic conversation and everyday situations",
  },
  {
    value: "intermediate",
    label: "JLPT N3",
    description: "Broader daily-life vocabulary and grammar",
  },
  {
    value: "upper_intermediate",
    label: "JLPT N2",
    description: "Complex grammar, news-style and abstract topics",
  },
  {
    value: "advanced",
    label: "JLPT N1",
    description: "Near-native nuance, formal registers, and idioms",
  },
];

export const FLUENCY_TO_PLACEMENT: Record<IslandFluencyLevel, PlacementLevel> = {
  beginner: "beginner",
  elementary: "elementary",
  intermediate: "intermediate",
  upper_intermediate: "upper_intermediate",
  advanced: "advanced",
};

export const JLPT_TO_PLACEMENT: Record<IslandJlptLevel, PlacementLevel> = {
  N5: "beginner",
  N4: "elementary",
  N3: "intermediate",
  N2: "upper_intermediate",
  N1: "advanced",
};

export const PROBE_BUMP_UP_THRESHOLD = 3;
export const PROBE_BUMP_DOWN_THRESHOLD = -3;
export const PATHWAY_BATCH_COUNT = 15;

export type ProbeRating = "confident" | "shaky" | "new";

export const PROBE_SCORE: Record<ProbeRating, number> = {
  confident: 1,
  shaky: 0,
  new: -1,
};
