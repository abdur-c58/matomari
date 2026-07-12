import type { TodayPlanType } from "@/types/today";
import { APP_NAME, METHOD_NAME } from "@/lib/constants/branding";

export type GuideAccent = TodayPlanType | "neutral";

export interface GuideChecklistItem {
  step: number;
  type: TodayPlanType;
  title: string;
  description: string;
  href: string;
}

export interface GuideStepSection {
  id: string;
  accent: GuideAccent;
  title: string;
  summary: string;
  bullets: string[];
}

export interface GuideSignalRow {
  signal: string;
  knowIt: string;
  needsPractice: string;
}

export interface GuideStarLevel {
  stars: number;
  label: string;
  description: string;
}

export const methodGuideHero = {
  title: METHOD_NAME,
  subtitle: "How to learn Japanese with this app",
  intro:
    `${APP_NAME} is built on Natural Language Learning — practical Japanese through real sentences, not grammar tables. You stockpile useful phrases, train your mouth with shadowing, and force your brain to retrieve Japanese under pressure. No streaks or points — just sentences moving from new → confident → mastered.`,
};

export interface GuidePurposePillar {
  title: string;
  description: string;
}

export const methodPurpose = {
  title: "What this app is for",
  intro:
    `Most learners stall because they collect passive knowledge — they understand shows and apps but freeze when speaking. ${APP_NAME} targets the skills you actually need in conversation: knowing what sentences mean, saying them with native rhythm, and producing Japanese instantly from English prompts.`,
  pillars: [
    {
      title: "Knowledge",
      description:
        "Build a rolling batch of high-value sentences — your pathway batches and topic islands — so vocabulary and grammar arrive in context, not isolation.",
    },
    {
      title: "Retrieval",
      description:
        "Active recall turns passive recognition into words you can say on demand. This is where fluency is won or lost.",
    },
    {
      title: "Articulation",
      description:
        "Shadowing at native speed trains pronunciation, rhythm, and muscle memory so Japanese feels natural in your mouth.",
    },
  ] satisfies GuidePurposePillar[],
};

export interface GuideBrainPoint {
  title: string;
  body: string;
}

export const brainLearning = {
  title: "How your brain learns best",
  intro:
    "Language learning is physiology, not magic. Your brain rewires through focused effort — what NLL calls “spaced stress.” Passive input alone (watching, reading without producing) stores words you recognize but cannot use. Deliberate difficulty is what moves them into active memory.",
  points: [
    {
      title: "Effort triggers change",
      body: "Neuroplasticity kicks in when you repeat material under focus in a short window — not when you passively binge content. Structured reps on a sentence list beat casual immersion for speaking skills.",
    },
    {
      title: "Struggle is the signal",
      body: "When shadowing makes you sweat to keep up, or active recall forces you to hunt for a word before revealing the answer — that friction is the workout. Easy review feels good; hard retrieval builds memory.",
    },
    {
      title: "Active beats passive",
      body: "Understanding a sentence and producing it from scratch use different brain pathways. You need both, but production practice is what stops you from going blank in real conversation.",
    },
    {
      title: "Consistency over marathons",
      body: `30–45 minutes of deliberate daily practice outpaces occasional long sessions. ${APP_NAME}'s Today plan is sized for that rhythm — meaning, shadow, recall, review.`,
    },
  ] satisfies GuideBrainPoint[],
};

export interface GuideDifficultyStep {
  step: string;
  level: string;
  accent: GuideAccent;
  whatHappens: string;
  whyItWorks: string;
}

export const difficultyLadder = {
  title: "Each step adds difficulty",
  description:
    "The daily loop mirrors how NLL stacks exercises — each layer is harder than the last, so your brain keeps adapting.",
  steps: [
    {
      step: "Meaning check",
      level: "Understand",
      accent: "meaning_check",
      whatHappens: "Read English and Japanese until you can explain the meaning without guessing.",
      whyItWorks: "Comprehensible input first — never shadow audio you do not understand.",
    },
    {
      step: "Listen & shadow",
      level: "Articulate",
      accent: "listen_shadow",
      whatHappens: "Repeat in rhythm with native audio at full speed until the phrase flows.",
      whyItWorks: "Simultaneous listen-and-speak builds pronunciation and pattern recognition through focused reps.",
    },
    {
      step: "Active recall",
      level: "Produce",
      accent: "active_recall",
      whatHappens: "See English only, say Japanese aloud, then reveal and self-correct.",
      whyItWorks: "Forces retrieval under pressure — the hardest step and the one that locks sentences into speech.",
    },
    {
      step: "Review",
      level: "Consolidate",
      accent: "review",
      whatHappens: "Retired sentences return on a spaced schedule before you forget them.",
      whyItWorks: "Spacing repeats the struggle at the right moment so memory sticks long-term.",
    },
  ] satisfies GuideDifficultyStep[],
};

export const methodOverview = {
  title: "The three-step loop",
  steps: [
    {
      number: 1,
      title: "Batch learning",
      description:
        "Pick a pathway batch or language island (~20–25 sentences). Work through them as a rolling set — new sentences enter as weak ones retire.",
    },
    {
      number: 2,
      title: "Listen & shadow",
      description:
        "After you understand each meaning, shadow the audio at full native speed. Repeat in rhythm until it feels natural.",
    },
    {
      number: 3,
      title: "Active recall",
      description:
        "See the English prompt, produce Japanese unaided, reveal the answer, and honestly self-mark. Ratings drive retirement and review.",
    },
  ],
};

export const dailyChecklist: GuideChecklistItem[] = [
  {
    step: 1,
    type: "meaning_check",
    title: "Confirm meanings",
    description: "Understand each sentence before listening — never shadow what you don't get.",
    href: "/listen?step=meaning",
  },
  {
    step: 2,
    type: "listen_shadow",
    title: "Listen & shadow",
    description: "Passive listening at native speed once all meanings are confirmed.",
    href: "/listen?step=shadow",
  },
  {
    step: 3,
    type: "active_recall",
    title: "Active recall",
    description: "Produce Japanese from English prompts for sentences due today.",
    href: "/recall",
  },
  {
    step: 4,
    type: "review",
    title: "Review retired sentences",
    description: "Spaced repetition check-ins for sentences that left your active batch.",
    href: "/recall?mode=review",
  },
];

export const pathwayVsIslands = {
  id: "pathway-vs-islands",
  title: "Main pathway vs islands",
  summary:
    "The main pathway is your structured daily curriculum. Islands are optional topic sets you can switch to anytime.",
  bullets: [
    "Main pathway: numbered batches in order — follow these for steady daily progress through core Japanese.",
    "Islands: thematic sentence pools (travel, izakaya, etc.) — great for situational practice or a change of pace.",
    "You study one active batch at a time (~20–25 sentences). Switching focus on the Study page replaces your current rolling set.",
    "After import, start with the recommended pathway batch. Add or browse islands when you want topic-specific practice.",
  ],
};

export const howToSections: GuideStepSection[] = [
  {
    id: "pathway-vs-islands",
    accent: "neutral",
    title: pathwayVsIslands.title,
    summary: pathwayVsIslands.summary,
    bullets: pathwayVsIslands.bullets,
  },
  {
    id: "batch",
    accent: "neutral",
    title: "Building your batch",
    summary: "Choose a pathway or island and start with ~20–25 sentences.",
    bullets: [
      "Go to Study and pick a main pathway batch or topic island.",
      "Default batch size is adjustable in Settings (10–40 sentences).",
      "Sentences retire from the active batch at 4+ stars and enter the review pool.",
      "New unseen sentences fill the empty slots — your batch rolls forward.",
    ],
  },
  {
    id: "meaning",
    accent: "meaning_check",
    title: "Meaning check",
    summary: "Never loop audio for a sentence you don't understand.",
    bullets: [
      "Read the English, then the Japanese. Tap \"Got it\" only when you can explain the meaning without peeking.",
      "If unsure, study the sentence longer — don't rush into shadowing.",
      "All batch meanings must be confirmed before Listen & shadow unlocks on Today.",
    ],
  },
  {
    id: "listen",
    accent: "listen_shadow",
    title: "Listen & shadow",
    summary: "Native speed only. Shadow in rhythm with the audio.",
    bullets: [
      "Play at 1× speed — no slow-down crutches.",
      "Use shadow pause to repeat phrases in time with the speaker.",
      "Optional: record yourself and compare rhythm and clarity.",
      "Revisit weak sentences from the Weak Sentences drill anytime.",
    ],
  },
  {
    id: "recall",
    accent: "active_recall",
    title: "Active recall",
    summary: "English in → Japanese out → reveal → self-mark.",
    bullets: [
      "Read the English prompt and produce Japanese before revealing.",
      "Mark correct only if you got it without hesitation or peeks at reading/romaji.",
      "The app suggests a star rating based on your recall history — adjust honestly.",
      "Sentences with 1–2 stars surface in Weak Sentences for extra drilling.",
    ],
  },
  {
    id: "review",
    accent: "review",
    title: "Review pool",
    summary: "Retired sentences return on an SRS schedule.",
    bullets: [
      "At 4+ stars, a sentence retires from your active batch.",
      "Your first review is scheduled based on your star rating and recall history — not immediately.",
      "Retired sentences reappear on Today when SRS says they're due.",
      "5 stars with strong recall history marks a sentence as mastered.",
    ],
  },
];

export const masterySignals: GuideSignalRow[] = [
  {
    signal: "Meaning",
    knowIt: "Tapped \"Got it\" and can explain the English without peeking",
    needsPractice: "Still unsure what the sentence means",
  },
  {
    signal: "Shadowing",
    knowIt: "Can repeat in time with audio with intelligible rhythm",
    needsPractice: "Falling behind, mumbling, or skipping words",
  },
  {
    signal: "Active recall",
    knowIt: "Produce Japanese correctly without hesitation",
    needsPractice: "Frequent misses or needed reading/romaji peek",
  },
  {
    signal: "Star rating",
    knowIt: "4–5 stars with 3+ consecutive correct recalls",
    needsPractice: "1–2 stars or under 40% recall accuracy",
  },
  {
    signal: "Batch status",
    knowIt: "Retired (4+ stars) — in the review pool",
    needsPractice: "Still in the active batch",
  },
];

export const starGuide: GuideStarLevel[] = [
  {
    stars: 5,
    label: "Mastered",
    description:
      "5+ consecutive correct recalls and 90%+ accuracy. Sentence is fully mastered.",
  },
  {
    stars: 4,
    label: "Ready to retire",
    description:
      "3+ consecutive correct recalls and 75%+ accuracy. Eligible to leave the active batch.",
  },
  {
    stars: 3,
    label: "Improving",
    description: "60%+ recall accuracy. Shaky but trending up — keep practicing.",
  },
  {
    stars: 2,
    label: "Weak",
    description: "40–60% accuracy. Appears in Weak Sentences for extra work.",
  },
  {
    stars: 1,
    label: "Very weak",
    description: "Under 40% accuracy. Priority drill in Weak Sentences.",
  },
];

export const antiPatterns = {
  title: "What this app deliberately avoids",
  items: [
    "No streaks, points, or badges — motivation comes from real progress.",
    "No gamified leaderboards or daily login rewards.",
    "Progress means sentences mastered and weak count trending down.",
    "Honest self-rating beats inflated scores every time.",
  ],
};
