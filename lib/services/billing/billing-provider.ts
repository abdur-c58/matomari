import type { BillingInterval } from "@/lib/constants/pricing";
import type {
  BillingWebhookEvent,
  CancelSubscriptionResult,
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

  handleWebhookEvent(event: BillingWebhookEvent): Promise<void>;

  getCustomerPortalUrl(params: {
    userId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
}
