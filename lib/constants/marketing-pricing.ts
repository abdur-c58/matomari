/**
 * DUMMY / PLACEHOLDER PRICING — not live billing.
 * Swap the numbers in `marketingPricingTiers` when real plans ship.
 * There is no subscription/entitlement enforcement in the product yet;
 * island caps below are marketing placeholders (aligned with
 * DEFAULT_ISLAND_SENTENCE_COUNT = 20 and AI duration tiers ~10/22/45).
 */
export const marketingPricingTiers = {
  free: {
    id: "free",
    name: "Free",
    eyebrow: "Start here",
    /** Placeholder — keep $0 until a paid trial exists. */
    priceMonthly: 0,
    priceLabel: "$0",
    priceSuffix: "forever",
    blurb:
      "A complete daily practice loop for building useful Japanese one sentence at a time.",
    features: [
      "3 islands at a time",
      "Up to 20 sentences per island",
      "Meaning → shadow → recall loop",
      "Daily Dashboard queue",
      "Sentence audio and basic progress",
    ],
    cta: { label: "Sign in with Google", href: "/today" },
  },
  plus: {
    id: "plus",
    name: "Plus",
    eyebrow: "More room",
    /**
     * PLACEHOLDER monthly price — change this one number when pricing is final.
     * Landing shows this simple monthly figure; /pricing can still show longer billing options.
     */
    priceMonthly: 9,
    priceLabel: "$9",
    priceSuffix: "/ mo",
    blurb:
      "Higher limits for learners who keep more islands in motion and want deeper progress views.",
    features: [
      "Everything in Free",
      "More islands at a time",
      "Up to 50 sentences per island",
      "Expanded AI island generation",
      "Offline-ready audio packages",
      "Deeper progress views",
    ],
    cta: { label: "Coming soon", href: null },
  },
} as const;

export const marketingPricingSection = {
  /** Code/UI marker — this block is dummy content until billing exists. */
  tag: "[PRICING_DUMMY]",
  eyebrow: "Plans",
  title: "Start free. Grow when you need to.",
  body: "Two simple tiers. Numbers below are placeholders — checkout is not live yet.",
  note: "Dummy pricing preview · no payment or Plus entitlement exists yet.",
} as const;

/** Kept for any remaining references to the old TODO placeholder. */
export const marketingPricingPlaceholder = marketingPricingSection;
