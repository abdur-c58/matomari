/**
 * Editable Paddle catalog tiers (Free + paid plans).
 * Price IDs are resolved server-side from env — never hardcode pri_… here.
 */
import { ENTITLEMENTS } from "@/lib/constants/entitlements";
import { paddlePriceIdsFromEnv } from "@/lib/paddle/env";

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

export type PaddleCatalogResult = {
  tiers: PaddleCatalogTier[];
  /** False when any PADDLE_PRICE_* env var is missing (page still renders). */
  pricesConfigured: boolean;
};

const FREE_TIER: PaddleFreeTier = {
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
};

/** Marketing copy + Paddle price IDs for the pricing page (server-only, never throws). */
export function getPaddleCatalogTiers(): PaddleCatalogResult {
  const ids = paddlePriceIdsFromEnv();

  const plusTier: PaddlePaidTier = {
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
    priceId: {
      month: ids.plusMonthly ?? "",
      year: ids.plusAnnual ?? "",
    },
  };

  const proTier: PaddlePaidTier = {
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
    priceId: {
      month: ids.proMonthly ?? "",
      year: ids.proAnnual ?? "",
    },
  };

  return {
    pricesConfigured: ids.configured,
    tiers: [FREE_TIER, plusTier, proTier],
  };
}

export function isPaidTier(
  tier: PaddleCatalogTier
): tier is PaddlePaidTier {
  return tier.id !== "free";
}

export function paidTierPricesConfigured(tier: PaddlePaidTier): boolean {
  return Boolean(tier.priceId.month && tier.priceId.year);
}
