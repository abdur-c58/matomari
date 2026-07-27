import type { SubscriptionStatus } from "@/lib/services/billing/subscription-service";
import type { SubscriptionTierId } from "@/lib/constants/entitlements";

export type CheckoutSession = {
  id: string;
  url: string;
  customerId: string;
};

export type BillingWebhookEventType =
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_failed";

export type BillingWebhookEvent = {
  id: string;
  type: BillingWebhookEventType;
  data: {
    userId: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    tier?: SubscriptionTierId;
    status?: SubscriptionStatus;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  };
};

export type CancelSubscriptionResult = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  status: SubscriptionStatus;
};

export type ChangePlanResult = {
  plan: "plus" | "pro";
  interval: "monthly" | "annual";
  /** User is charged/credited now (prorated). */
  effectiveImmediately: true;
  currentPeriodEnd: string | null;
  status: SubscriptionStatus;
};

export type ChangePlanPreview = {
  plan: "plus" | "pro";
  interval: "monthly" | "annual";
  chargeAmount: string;
  creditAmount: string;
  currencyCode: string;
  chargeLabel: string;
  creditLabel: string;
  netLabel: string;
};
