export const MARKETING_VIDEO = {
  src: "/assets/marketing/kotoshima-promo.mp4",
  poster: "/assets/marketing/kotoshima-promo-poster.jpg",
  width: 1920,
  height: 1080,
  durationSeconds: 52.5,
} as const;

export const marketingHero = {
  eyebrow: "Japanese for real use",
  title: "A daily loop built around your life.",
  subtitle:
    "Tell Kotoshima what you need Japanese for. AI shapes real sentences around your goals, interests, level, and daily life.",
  primaryCta: "Sign in with Google",
  secondaryCta: "See how it works",
  brandJp: "言島",
} as const;

export const marketingProblem = {
  eyebrow: "The gap",
  title: "Be ready to say it.",
  body: "Generic phrases only take you so far. Kotoshima helps you practice the Japanese your life actually calls for — then trains the useful test: can you say it when you need it?",
  cards: [
    { label: "Seen before", detail: "Familiar on the page" },
    { label: "Sounds familiar", detail: "Recognized in audio" },
    { label: "Hard to produce", detail: "Missing when speaking" },
  ],
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
      description: "Bring confident sentences back at widening intervals so they remain available.",
    },
  ],
} as const;

export const marketingHorizontalFeatures = [
  {
    id: "islands",
    eyebrow: "AI-personalized learning",
    title: "Turn your world into an island.",
    body: "Describe the Japanese you need — a trip, your job, a hobby, a relationship, or something entirely your own. AI builds a focused island around your level and preferred depth.",
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
    eyebrow: "Island sharing",
    title: "Create a link. Copy it.",
    body: "Anyone signed in with the link can preview and import a live read-only copy. Regenerating replaces the link; existing copies stay in libraries.",
    points: ["Share links for signed-in previews", "Live read-only import", "Clone later if you want to edit"],
  },
] as const;

export const marketingNarration = {
  eyebrow: "AI-generated conversations",
  title: "Two voices. One scene.",
  body: "Describe a conversation you want to handle. Kotoshima turns it into a natural two-person scene you can listen to, shadow, and say out loud.",
  points: [
    "Build scenes for your real plans and relationships",
    "Choose your level, tone, and conversation depth",
    "Practice natural back-and-forth instead of isolated phrases",
  ],
} as const;

export const marketingVideo = {
  eyebrow: "Product walkthrough",
  title: "Watch the loop in motion.",
  body: "See a personal idea become an AI-built island, then move through audio, daily practice, progress, and sharing.",
} as const;

export const marketingSocialProofPlaceholder = {
  tag: "[SOCIAL_PROOF_TODO]",
  eyebrow: "Still in development",
  title: "Social proof will live here.",
  body: "No testimonials, user counts, or review scores yet. Replace this block when real feedback is ready — do not invent quotes or numbers.",
} as const;

export const marketingPricingPlaceholder = {
  tag: "[PRICING_TODO]",
  eyebrow: "Plans",
  title: "Pricing details coming soon.",
  body: "Kotoshima is free to use today. Formal plan tiers are not defined in the product yet — fill this section when billing exists.",
  note: "LICENSE.md currently states: “Kotoshima is free to use.”",
} as const;

export const marketingCta = {
  title: "Build Japanese around your life.",
  body: "Tell Kotoshima what you want to say. Get a focused island shaped to your needs, then practice it until it comes naturally.",
  primaryCta: "Sign in with Google",
} as const;

export const marketingFooter = {
  tagline: "Personalized Japanese learning through language islands",
  links: [
    { label: "Features", href: "/", section: "features" },
    { label: "Narration", href: "/", section: "narration" },
    { label: "Walkthrough", href: "/", section: "walkthrough" },
    { label: "Sign in", href: "/today" },
    { label: "Pricing", href: "/pricing" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
