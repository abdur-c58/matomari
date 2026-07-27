import type { BillingInterval } from "@/lib/constants/pricing";
import type {
  BillingWebhookEvent,
  CancelSubscriptionResult,
  ChangePlanResult,
  ChangePlanPreview,
  CheckoutSession,
} from "@/lib/services/billing/types";

/**
 * Billing provider interface. Call sites depend on this only — not Paddle SDK details.
 */
export interface BillingProvider {
  createCheckoutSession(params: {
    userId: string;
    email?: string | null;
    successUrl: string;
    cancelUrl: string;
    /** Paid plan to purchase. */
    plan?: "plus" | "pro";
    /** Billing interval (maps to Paddle Price ID). */
    interval?: BillingInterval;
  }): Promise<CheckoutSession>;

  cancelSubscription(params: {
    userId: string;
  }): Promise<CancelSubscriptionResult>;

  /** Staff/test only — not exposed in Settings. */
  cancelSubscriptionImmediate(params: {
    userId: string;
  }): Promise<CancelSubscriptionResult>;

  /**
   * Swap Plus ↔ Pro on an existing Paddle subscription (same billing interval).
   * Upgrades charge a prorated difference immediately; downgrades credit immediately.
   */
  changeSubscriptionPlan(params: {
    userId: string;
    plan: "plus" | "pro";
  }): Promise<ChangePlanResult>;

  previewSubscriptionPlanChange(params: {
    userId: string;
    plan: "plus" | "pro";
  }): Promise<ChangePlanPreview>;

  /** Re-fetch a subscription from Paddle and sync the local row (cron backstop). */
  syncSubscriptionFromPaddleRemote(params: {
    userId: string;
    subscriptionId: string;
  }): Promise<void>;

  handleWebhookEvent(event: BillingWebhookEvent): Promise<void>;

  getCustomerPortalUrl(params: {
    userId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
}
