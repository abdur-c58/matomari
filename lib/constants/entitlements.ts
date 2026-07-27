/**
 * Single source of truth for Free / Plus / Pro product caps.
 * Keep SQL helpers in migrations in sync.
 */

export type SubscriptionTierId = "free" | "plus" | "pro";

/** Free users may try this premade only; 300 Essentials stay locked. */
export const FREE_TRY_PREMADE_KEY = "premade_100_basic_sentences";

const TIER_RANK: Record<SubscriptionTierId, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

export const ENTITLEMENTS = {
  free: {
    tier: "free" as const,
    maxScenes: 3,
    maxSentencesPerScene: 20,
    /** Backstop against delete-and-regenerate abuse — not a marketed limit. */
    dailySceneGenerations: 15,
    allowsNarrationCreate: false,
    allowsOfflinePackages: false,
    allowsDeeperProgress: false,
    allowsVoiceSelection: false,
    allowsSceneExport: false,
    priorityAiQueue: false,
    freeTryPremadeKey: FREE_TRY_PREMADE_KEY,
  },
  plus: {
    tier: "plus" as const,
    maxScenes: 15,
    maxSentencesPerScene: 50,
    dailySceneGenerations: 50,
    allowsNarrationCreate: true,
    allowsOfflinePackages: true,
    allowsDeeperProgress: true,
    allowsVoiceSelection: false,
    allowsSceneExport: false,
    priorityAiQueue: false,
    freeTryPremadeKey: FREE_TRY_PREMADE_KEY,
  },
  pro: {
    tier: "pro" as const,
    maxScenes: 50,
    maxSentencesPerScene: 150,
    dailySceneGenerations: 100,
    allowsNarrationCreate: true,
    allowsOfflinePackages: true,
    allowsDeeperProgress: true,
    allowsVoiceSelection: true,
    allowsSceneExport: true,
    priorityAiQueue: true,
    freeTryPremadeKey: FREE_TRY_PREMADE_KEY,
  },
} as const;

export type EntitlementCaps = (typeof ENTITLEMENTS)[SubscriptionTierId];

export function getEntitlementCaps(tier: SubscriptionTierId): EntitlementCaps {
  return ENTITLEMENTS[tier];
}

export function tierRank(tier: SubscriptionTierId): number {
  return TIER_RANK[tier];
}

/** True when `userTier` is at least `minTier` (plus includes pro). */
export function hasMinTier(
  userTier: SubscriptionTierId,
  minTier: "plus" | "pro"
): boolean {
  return tierRank(userTier) >= TIER_RANK[minTier];
}

/** @deprecated Import from `@/lib/constants/pricing` — re-exported for callers. */
export {
  PLUS_PRICE_MONTHLY_USD,
  PLUS_PRICE_ANNUAL_USD,
  PLUS_ANNUAL_SAVINGS_USD,
  PRO_PRICE_MONTHLY_USD,
  PRO_PRICE_ANNUAL_USD,
  PRO_ANNUAL_SAVINGS_USD,
} from "@/lib/constants/pricing";
