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
