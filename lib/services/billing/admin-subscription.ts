import { hasMinTier, type SubscriptionTierId } from "@/lib/constants/entitlements";
import type { UserSubscriptionRow } from "@/lib/services/billing/subscription-service";

/** Admin-granted subs use a synthetic Paddle subscription id prefix. */
export const ADMIN_SUBSCRIPTION_PREFIX = "pad_sub_admin_";

export type AdminGrantDuration =
  | "7d"
  | "30d"
  | "90d"
  | "365d"
  | "lifetime"
  | "custom";

export type SubscriptionBillingSource = "none" | "admin" | "paddle";

const LEGACY_ADMIN_PREFIXES = ["pad_sub_comp_", "pad_sub_ovr_"] as const;

export function isAdminGrantedSubscription(
  sub: UserSubscriptionRow | null | undefined
): boolean {
  const id = sub?.paddleSubscriptionId;
  if (!id) return false;
  if (id.startsWith(ADMIN_SUBSCRIPTION_PREFIX)) return true;
  return LEGACY_ADMIN_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function isPaidPaddleSubscription(
  sub: UserSubscriptionRow | null | undefined
): boolean {
  if (!sub?.paddleSubscriptionId) return false;
  return !isAdminGrantedSubscription(sub);
}

export function subscriptionBillingSource(
  sub: UserSubscriptionRow | null | undefined
): SubscriptionBillingSource {
  if (!sub || !hasMinTier(sub.tier, "plus")) return "none";
  if (isAdminGrantedSubscription(sub)) return "admin";
  if (sub.paddleSubscriptionId) return "paddle";
  return "none";
}

export function isAdminGrantExpired(sub: UserSubscriptionRow): boolean {
  if (!isAdminGrantedSubscription(sub)) return false;
  if (!sub.currentPeriodEnd) return false;
  return new Date(sub.currentPeriodEnd).getTime() <= Date.now();
}

export function parseAdminGrantDuration(
  raw: unknown
): { duration: AdminGrantDuration; days: number | null } | null {
  if (raw === "lifetime") return { duration: "lifetime", days: null };

  const presets: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
    "1y": 365,
  };

  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed in presets) {
      const key = trimmed as keyof typeof presets;
      return { duration: key === "1y" ? "365d" : (key as AdminGrantDuration), days: presets[key] };
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      const days = Math.min(Math.floor(asNumber), 3650);
      return { duration: "custom", days };
    }
  }

  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const days = Math.min(Math.floor(raw), 3650);
    return { duration: "custom", days };
  }

  return null;
}

export function computeAdminGrantPeriodEnd(days: number | null): string | null {
  if (days == null) return null;
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString();
}

export function normalizeAdminGrantTier(raw: unknown): SubscriptionTierId {
  return raw === "pro" ? "pro" : "plus";
}

export function formatAdminGrantDurationLabel(
  duration: AdminGrantDuration,
  days: number | null
): string {
  if (duration === "lifetime") return "Lifetime";
  if (duration === "7d") return "7 days";
  if (duration === "30d") return "30 days";
  if (duration === "90d") return "90 days";
  if (duration === "365d") return "1 year";
  if (days != null) return `${days} days`;
  return "Custom";
}
