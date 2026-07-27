export const MARKETING_VIDEO = {
  src: "/assets/marketing/matomari-promo.mp4",
  poster: "/assets/marketing/matomari-promo-poster.jpg",
  width: 1920,
  height: 1080,
  durationSeconds: 52.5,
} as const;

export const marketingHero = {
  eyebrow: "",
  title: "A daily loop built around your life.",
  subtitle:
    "Tell Matomari what you need Japanese for. AI shapes real sentences around your goals, interests, level, and daily life.",
  primaryCta: "Sign in with Google",
  secondaryCta: "See how it works",
  brandJp: "まとまり",
} as const;

export const marketingProblem = {
  eyebrow: "The gap",
  title: "Textbooks teach grammar. Life asks different questions.",
  body: "Matomari trains the sentences real situations actually call for — the ones you'd normally only pick up after months of mistakes and corrections. Learn them straight, and be ready to say it when it counts.",
  gapDemo: {
    stages: [
      {
        situation: "Splitting a bill",
        confidence: "You can ask how much something costs.",
        moment: "Dinner's over. Four people, one check.",
        gap: 'You don\'t know how to say "separately."',
        real: "別々に払えますか。",
        meaning: "Can we pay separately?",
        audioSrc: "/assets/marketing/gap-03.mp3",
        payoff: "Two words your textbook skipped. The ones that save the moment.",
      },
      {
        situation: "Asking someone to slow down",
        confidence: "You can conjugate verbs. You can describe your day.",
        moment: "Someone just answered you — too fast to follow.",
        gap: "You smile. You nod. You understood nothing.",
        real: "もう少しゆっくり話していただけますか。",
        meaning: "Could you speak a little more slowly?",
        audioSrc: "/assets/marketing/gap-02.mp3",
        payoff: "This is what gets you the second try!",
      },
    ],
    /** Shown under each Japanese reveal so hover/click isn't missed. */
    playHint: "Hover · click to play",
    playHintTouch: "Tap the Japanese to play",
    closing: [
      "You don't need fluency to walk into these moments with confidence.",
      "You need the right sentences — ready before you need them.",
      "That's what Matomari trains: not grammar drills, but the moments themselves.",
    ],
    bridge: "Here's what we mean.",
    pictureThis: "Picture this",
  },
} as const;

export const marketingDailyLoop = {
  eyebrow: "Your daily loop",
  title: "Small steps. Every day.",
  body: "Dashboard builds a short queue from the topics and situations you chose — no generic lesson order, just your sentences moving from new to confident to mastered.",
  steps: [
    {
      id: "meaning",
      accent: "var(--mode-meaning)",
      title: "Confirm meanings",
      description: "Build a clear meaning anchor before pronunciation work begins.",
    },
    {
      id: "shadow",
      accent: "var(--mode-listen)",
      title: "Listen & shadow",
      description: "Turn understanding into speech by matching rhythm and intonation.",
    },
    {
      id: "recall",
      accent: "var(--mode-recall)",
      title: "Active recall",
      description: "Strengthen retrieval by producing Japanese before seeing the answer.",
    },
    {
      id: "review",
      accent: "var(--mode-review)",
      title: "Review retired sentences",
      description: "Bring confident sentences back at widening intervals so they remain available and wired to your subconscious.",
    },
  ],
} as const;

export const marketingHorizontalFeatures = [
  {
    id: "scenes",
    eyebrow: "AI-personalized learning",
    title: "Turn your world into an scene.",
    body: "Describe the Japanese you need — a trip, your job, a hobby, a relationship, or something entirely your own. AI builds a focused scene around your level and preferred depth.",
    points: [
      "Start from an idea or choose a premade foundation",
      "Match your level, format, and session depth",
      "Preview and shape the result before saving",
    ],
  },
  {
    id: "audio",
    eyebrow: "Audio built for shadowing",
    title: "Hear the rhythm. Match the intonation.",
    body: "Playback speeds from 0.5× to 1.5×, looping, and sentence-level audio so you can train your mouth without hunting for clips.",
    points: ["Native-speed shadowing practice", "Speed and loop controls", "Offline audio packages after first download"],
  },
  {
    id: "sharing",
    eyebrow: "Scene sharing",
    title: "Create a link. Copy it.",
    body: "Share what you've built with a friend, a study group, or your classroom — they can try it instantly, no account needed to preview.",
    points: [
      "Share with friends, study groups, or classrooms",
      "Instant preview — no account required",
      "Clone later if you want to edit",
    ],
  },
] as const;

export const marketingNarration = {
  eyebrow: "AI-generated conversations",
  title: "Two voices. One scene. Casual speech.",
  body: "Describe a conversation/theme you want to handle. Matomari generates a natural two-person scene you can listen to, shadow, and say out loud.",
  points: [
    "Build scenes for your real plans and relationships",
    "Choose your level, tone, and conversation depth",
    "Practice natural back-and-forth instead of isolated phrases",
    "Generate conversations that last for as long as you need."
  ],
} as const;

export const marketingVideo = {
  eyebrow: "Product walkthrough",
  title: "Watch the loop in motion.",
  body: "See a personal idea become an AI-built scene, then move through audio, daily practice, progress, and sharing.",
} as const;

export const marketingSocialProofPlaceholder = {
  tag: "[SOCIAL_PROOF_TODO]",
  eyebrow: "Still in development",
  title: "Social proof will live here.",
  body: "No testimonials, user counts, or review scores yet. Replace this block when real feedback is ready — do not invent quotes or numbers.",
} as const;

// Pricing copy + dummy tier prices live in marketing-pricing.ts (single swap point).
export {
  marketingPricingSection,
  marketingPricingTiers,
  marketingPricingPlaceholder,
} from "@/lib/constants/marketing-pricing";

export const marketingCta = {
  title: "Build Japanese around your life.",
  body: "Tell Matomari what you want to say. Get a focused scene shaped to your needs, then practice it until it comes naturally.",
  primaryCta: "Sign in with Google",
} as const;

export const marketingFooter = {
  tagline: "Personalized Japanese learning through language scenes",
  links: [
    { label: "The gap", href: "/", section: "problem" },
    { label: "Features", href: "/", section: "features" },
    { label: "Scenes", href: "/", section: "scenes" },
    { label: "Narration", href: "/", section: "narration" },
    { label: "Walkthrough", href: "/", section: "walkthrough" },
    { label: "Pricing", href: "/", section: "pricing" },
    { label: "Sign in", href: "/today" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
