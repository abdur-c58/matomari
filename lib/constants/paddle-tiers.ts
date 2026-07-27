/**
 * Editable Paddle catalog tiers (Free + paid plans).
 * Price IDs are resolved server-side from env — never hardcode pri_… here.
 */
import { ENTITLEMENTS } from "@/lib/constants/entitlements";

export type PaidPlanId = "plus" | "pro";

export interface PaddlePaidTier {
  id: PaidPlanId;
  name: "Plus" | "Pro";
  eyebrow: string;
  description: string;
  features: string[];
  priceId: { month: string; year: string };
}

export interface PaddleFreeTier {
  id: "free";
  name: "Free";
  eyebrow: string;
  description: string;
  features: string[];
}

export type PaddleCatalogTier = PaddleFreeTier | PaddlePaidTier;

function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Marketing copy + Paddle price IDs for the pricing page (server-only). */
export function getPaddleCatalogTiers(): PaddleCatalogTier[] {
  const plusMonthly = requireServerEnv("PADDLE_PRICE_PLUS_MONTHLY");
  const plusAnnual = requireServerEnv("PADDLE_PRICE_PLUS_ANNUAL");
  const proMonthly = requireServerEnv("PADDLE_PRICE_PRO_MONTHLY");
  const proAnnual = requireServerEnv("PADDLE_PRICE_PRO_ANNUAL");

  return [
    {
      id: "free",
      name: "Free",
      eyebrow: "Start here",
      description:
        "A complete daily practice loop — enough room to build useful Japanese one sentence at a time.",
      features: [
        `${ENTITLEMENTS.free.maxScenes} custom scenes`,
        `${ENTITLEMENTS.free.maxSentencesPerScene} sentences per scene`,
        "Daily practice loop & dashboard queue",
        "Basic Sentences premade (try)",
      ],
    },
    {
      id: "plus",
      name: "Plus",
      eyebrow: "More room",
      description:
        "Unlock Essentials packs, narration scenes, and room to grow a bigger library.",
      features: [
        `Up to ${ENTITLEMENTS.plus.maxScenes} scenes`,
        `Up to ${ENTITLEMENTS.plus.maxSentencesPerScene} sentences per scene`,
        "Essentials premade packs (300)",
        "Narration scenes & offline audio",
      ],
      priceId: { month: plusMonthly, year: plusAnnual },
    },
    {
      id: "pro",
      name: "Pro",
      eyebrow: "Full toolkit",
      description:
        "Voice control, exportable scenes, and space for a serious long-term library.",
      features: [
        `Up to ${ENTITLEMENTS.pro.maxScenes} scenes`,
        `Up to ${ENTITLEMENTS.pro.maxSentencesPerScene} sentences per scene`,
        "Narration voice selection",
        "PDF + audio exports & priority AI queue",
      ],
      priceId: { month: proMonthly, year: proAnnual },
    },
  ];
}

export function isPaidTier(
  tier: PaddleCatalogTier
): tier is PaddlePaidTier {
  return tier.id !== "free";
}
