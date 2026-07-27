/**
 * Pricing tier copy — caps from entitlements; money from pricing.ts.
 */
import { ENTITLEMENTS } from "@/lib/constants/entitlements";
import {
  formatUsd,
  paidPlanAnnualLabel,
  PLUS_PRICE_ANNUAL_USD,
  PLUS_PRICE_MONTHLY_USD,
  PRO_PRICE_ANNUAL_USD,
  PRO_PRICE_MONTHLY_USD,
} from "@/lib/constants/pricing";

export type PricingCell =
  | { kind: "check" }
  | { kind: "dash" }
  | { kind: "text"; value: string };

export type PricingComparisonRow = {
  label: string;
  free: PricingCell;
  plus: PricingCell;
  pro: PricingCell;
  /** Shared by everyone — can sit in a quieter “included” band. */
  universal?: boolean;
};

const check = { kind: "check" as const };
const dash = { kind: "dash" as const };
const text = (value: string): PricingCell => ({ kind: "text", value });

/** Shared comparison table rows (Free / Plus / Pro). */
export const pricingComparisonRows: PricingComparisonRow[] = [
  {
    label: "Daily practice loop (meaning → shadow → recall)",
    free: check,
    plus: check,
    pro: check,
    universal: true,
  },
  {
    label: "Dashboard study queue",
    free: check,
    plus: check,
    pro: check,
    universal: true,
  },
  {
    label: "Sentence audio on unlocked content",
    free: check,
    plus: check,
    pro: check,
    universal: true,
  },
  {
    label: "Custom scenes",
    free: text(String(ENTITLEMENTS.free.maxScenes)),
    plus: text(String(ENTITLEMENTS.plus.maxScenes)),
    pro: text(String(ENTITLEMENTS.pro.maxScenes)),
  },
  {
    label: "Sentences per scene",
    free: text(String(ENTITLEMENTS.free.maxSentencesPerScene)),
    plus: text(String(ENTITLEMENTS.plus.maxSentencesPerScene)),
    pro: text(String(ENTITLEMENTS.pro.maxSentencesPerScene)),
  },
  {
    label: "Basic Sentences premade (try)",
    free: check,
    plus: check,
    pro: check,
    universal: true,
  },
  {
    label: "Essentials premade packs (300)",
    free: dash,
    plus: check,
    pro: check,
  },
  {
    label: "Narration (dialogue) scenes",
    free: dash,
    plus: check,
    pro: check,
  },
  {
    label: "Expanded AI scene generation",
    free: dash,
    plus: check,
    pro: check,
  },
  {
    label: "Offline-ready audio packages",
    free: dash,
    plus: check,
    pro: check,
  },
  {
    label: "Deeper progress views",
    free: dash,
    plus: check,
    pro: check,
  },
  {
    label: "Narration voice selection",
    free: dash,
    plus: dash,
    pro: check,
  },
  {
    label: "Downloadable scene export (PDF + audio)",
    free: dash,
    plus: dash,
    pro: check,
  },
  {
    label: "Priority AI generation queue",
    free: dash,
    plus: dash,
    pro: check,
  },
  {
    label: "Early access to new features",
    free: dash,
    plus: dash,
    pro: check,
  },
];

/** @deprecated Prefer pricingComparisonRows */
export const pricingFeatureMatrix = pricingComparisonRows.map((row) => ({
  label: row.label,
  free: row.free.kind === "check" || row.free.kind === "text",
  plus: row.plus.kind === "check" || row.plus.kind === "text",
  pro: row.pro.kind === "check" || row.pro.kind === "text",
}));

export const marketingPricingTiers = {
  free: {
    id: "free" as const,
    name: "Free",
    eyebrow: "Start here",
    priceMonthly: 0,
    priceAnnual: 0,
    priceLabel: "$0",
    priceSuffix: "forever",
    annualBilled: null as string | null,
    annualSaving: null as string | null,
    blurb:
      "A complete daily practice loop — enough room to build useful Japanese one sentence at a time.",
    cta: { label: "Continue with Free", href: "/today" as string | null },
  },
  plus: {
    id: "plus" as const,
    name: "Plus",
    eyebrow: "More room",
    priceMonthly: PLUS_PRICE_MONTHLY_USD,
    priceAnnual: PLUS_PRICE_ANNUAL_USD,
    priceLabel: formatUsd(PLUS_PRICE_MONTHLY_USD),
    priceSuffix: "/ mo",
    annualBilled: paidPlanAnnualLabel("plus"),
    annualSaving: null as string | null,
    blurb:
      "Unlock Essentials packs, narration scenes, and room to grow a bigger library.",
    cta: {
      label: "Upgrade to Plus",
      href: "/pricing?plan=plus" as string | null,
    },
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    eyebrow: "Full toolkit",
    priceMonthly: PRO_PRICE_MONTHLY_USD,
    priceAnnual: PRO_PRICE_ANNUAL_USD,
    priceLabel: formatUsd(PRO_PRICE_MONTHLY_USD),
    priceSuffix: "/ mo",
    annualBilled: paidPlanAnnualLabel("pro"),
    annualSaving: null as string | null,
    blurb:
      "Voice control, exportable scenes, and space for a serious long-term library.",
    cta: {
      label: "Upgrade to Pro",
      href: "/pricing?plan=pro" as string | null,
    },
  },
} as const;

export const marketingPricingSection = {
  tag: "[PLANS]",
  eyebrow: "Plans",
  title: "Start free. Grow when you need to.",
  body: "Three simple tiers with server-enforced limits. Upgrade anytime with secure Paddle checkout.",
  note: "Cancel anytime — access continues through the end of the billing period.",
} as const;

export const marketingPricingPlaceholder = marketingPricingSection;
