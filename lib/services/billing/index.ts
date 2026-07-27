/**
 * App billing entrypoint — Paddle sandbox/live via env keys.
 */
import { PaddleBillingProvider } from "@/lib/services/billing/paddle-billing-provider";
import type { BillingProvider } from "@/lib/services/billing/billing-provider";

export const billingProvider: BillingProvider = new PaddleBillingProvider();

/** Concrete provider for signed Paddle webhook handling. */
export const paddleBillingProvider = billingProvider as PaddleBillingProvider;

export {
  getUserSubscriptionAdmin,
  ensureUserSubscriptionAdmin,
  upsertUserSubscriptionAdmin,
  computeEffectiveTier,
  listSubscriptionsByUserIdsAdmin,
  capsForSubscription,
} from "@/lib/services/billing/subscription-service";

export type {
  UserSubscriptionRow,
  SubscriptionStatus,
} from "@/lib/services/billing/subscription-service";

export type { SubscriptionTierId } from "@/lib/constants/entitlements";

/** Legacy flag kept for API/UI compatibility — simulation mode is off. */
export const BILLING_SIMULATION_MODE = false as const;

/** True when a Paddle API key is present (sandbox or live). */
export const BILLING_PADDLE_CONFIGURED = Boolean(
  process.env.PADDLE_API_KEY?.trim()
);
