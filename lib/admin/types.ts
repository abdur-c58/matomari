/** Paddle billing is connected via env keys (test mode first). */
export const BILLING_STATUS = {
  live: true,
  paddle: true,
  simulation: false,
  message:
    "Paddle billing is active (test or live keys from env). Comp, revoke, and overrides still update user_subscriptions directly.",
} as const;

import type { SubscriptionTierId } from "@/lib/constants/entitlements";

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
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
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
