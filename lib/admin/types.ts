/** Paddle billing is connected via env keys (test mode first). */
export const BILLING_STATUS = {
  live: false,
  paddle: true,
  simulation: false,
  message:
    "Paddle billing uses env keys (sandbox or production). Admin grants update user_subscriptions directly; paid revokes also cancel in Paddle.",
} as const;

import type { SubscriptionTierId } from "@/lib/constants/entitlements";
import type { SubscriptionBillingSource } from "@/lib/services/billing/admin-subscription";

export type AdminUserListItem = {
  userId: string;
  email: string | null;
  displayName: string;
  role: "user" | "admin" | "support";
  signupAt: string | null;
  lastActiveAt: string | null;
  subscriptionStatus: "active" | "canceled" | "past_due" | "none";
  subscriptionTier: SubscriptionTierId | null;
  effectiveTier: SubscriptionTierId;
  currentPeriodEnd: string | null;
  profileUpdatedAt: string;
};

export type AdminUserDetail = AdminUserListItem & {
  avatarUrl: string | null;
  canGrantSubscriptions: boolean;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  billingSource: SubscriptionBillingSource;
  isPaidSubscription: boolean;
  isAdminGrant: boolean;
  usage: {
    sceneCount: number;
    sentenceCount: number;
    storageBytes: number | null;
    lastActiveAt: string | null;
    datasetUpdatedAt: string | null;
    progressUpdatedAt: string | null;
    statsUpdatedAt: string | null;
  };
};
