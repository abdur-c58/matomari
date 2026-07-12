import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  Calendar,
  ClipboardList,
  Eye,
  Headphones,
  Layers,
  Library,
  MessageCircle,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants/branding";

export type OnboardingStepId =
  | "welcome"
  | "today"
  | "study"
  | "meanings"
  | "shadowing"
  | "recall"
  | "review"
  | "library_progress"
  | "tools"
  | "settings"
  | "guide_tutor"
  | "install";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string[];
  bullets?: string[];
  icon: LucideIcon;
  kanji?: string;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: `Welcome to ${APP_NAME}`,
    body: [
      `${APP_NAME} teaches practical Japanese through real sentences — not grammar tables.`,
      "You work in small batches, confirm meanings, shadow native audio, and recall Japanese from English prompts. Sentences move from new to confident to mastered.",
    ],
    icon: Sparkles,
    kanji: "言",
  },
  {
    id: "today",
    title: "Today — your daily plan",
    body: [
      "The Today page is your home base. It shows what to do next and tracks daily progress.",
      "Cards are ordered by priority: confirm meanings first, then shadow, recall, and review.",
    ],
    bullets: [
      "See how many items are due today",
      "Jump straight into your next study step",
    ],
    icon: Calendar,
    kanji: "今",
  },
  {
    id: "study",
    title: "Study — choose your batch",
    body: [
      "Study is where you pick your active batch — about 20–25 sentences you focus on at once.",
      "Choose from the numbered main pathway or custom topic islands you create or import.",
    ],
    bullets: [
      "Pathway batches follow a curated progression",
      "Islands let you study themes like café Japanese or travel phrases",
    ],
    icon: Layers,
    kanji: "学",
  },
  {
    id: "meanings",
    title: "Confirm meanings",
    body: [
      "Before listening, make sure you understand each sentence in your batch.",
      "This step prevents passive listening — you should know what you're hearing before you shadow it.",
    ],
    bullets: [
      "Read Japanese, reading, and English gloss",
      "Mark each sentence as understood when ready",
    ],
    icon: Eye,
    kanji: "意味",
  },
  {
    id: "shadowing",
    title: "Listen & shadow",
    body: [
      "Shadowing trains pronunciation, rhythm, and muscle memory at native speed.",
      "Listen to each sentence, then repeat out loud — match the timing and intonation.",
    ],
    bullets: [
      "Replay audio as many times as you need",
      "Do this after meanings are confirmed",
    ],
    icon: Headphones,
    kanji: "聴",
  },
  {
    id: "recall",
    title: "Active recall",
    body: [
      "This is where fluency is built. You see an English prompt and produce the Japanese from memory.",
      "Rate yourself honestly with stars — low ratings keep sentences in rotation; high ratings move them toward retirement.",
    ],
    bullets: [
      "No peeking until you've tried",
      "1–2 stars = needs more work; 4–5 = strong recall",
    ],
    icon: Brain,
    kanji: "思",
  },
  {
    id: "review",
    title: "Review retired sentences",
    body: [
      "Sentences you retire still come back on a spaced repetition schedule.",
      "Review checks whether you still know them — if not, they re-enter active study.",
    ],
    bullets: [
      "Due reviews appear on Today automatically",
      "Keeps long-term memory sharp without over-drilling",
    ],
    icon: BookOpen,
    kanji: "復",
  },
  {
    id: "library_progress",
    title: "Library & Progress",
    body: [
      "Library is your full sentence inventory — search, filter, bulk-rate, and translate missing entries.",
      "Progress shows mastery stats, weak-sentence trends, and time spent in each study mode.",
    ],
    bullets: [
      "Browse pathway and island sentences together",
      "Track weak spots and study streaks over time",
    ],
    icon: Library,
    kanji: "庫",
  },
  {
    id: "tools",
    title: "Pre-study & Weak sentences",
    body: [
      "Pre-study (Transcript analyzer) lets you paste a transcript or Japanese text before watching or listening — highlight unknown words and build an island from useful lines.",
      "Weak sentences collects everything you rated 1–2 stars so you can drill problem sentences in one tap.",
    ],
    icon: ClipboardList,
    kanji: "弱",
  },
  {
    id: "settings",
    title: "Settings & Preferences",
    body: [
      "Settings holds account info, cloud sync, default batch size, and import/export.",
      "Preferences is where you set your Japanese dialect and notification reminders.",
    ],
    bullets: [
      "Dialect affects translations and TTS pronunciation",
      "Sign in with Google to sync progress across devices",
      "Adjust batch size to match your daily capacity",
    ],
    icon: Settings,
    kanji: "設",
  },
  {
    id: "guide_tutor",
    title: "Guide & AI Tutor",
    body: [
      "The Method Guide explains the Kotoshima approach in depth — daily loop, star ratings, and why each step matters.",
      "The AI Tutor answers questions in context: general help from the menu, or sentence-specific help while you study.",
    ],
    bullets: [
      "Guide → full method reference anytime",
      "Ask tutor → chat without leaving your session",
    ],
    icon: MessageCircle,
    kanji: "導",
  },
  {
    id: "install",
    title: "Add Kotoshima to your home screen",
    body: [
      `${APP_NAME} works best installed as an app — full-screen study, smoother audio, and daily reminders.`,
      "Use the steps below for your device. You can replay this tour anytime from Settings.",
    ],
    icon: Upload,
    kanji: "島",
  },
];

export const onboardingStepCount = onboardingSteps.length;
