"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import type { PaddlePaidTier } from "@/lib/constants/paddle-tiers";
import type { BillingPeriod } from "@/lib/constants/pricing";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";

type SubscriptionSnapshot = {
  effectiveTier?: SubscriptionTierId;
  canChangePlan?: boolean;
};

function tierLabel(plan: "plus" | "pro") {
  return plan === "pro" ? "Pro" : "Plus";
}

/**
 * New subscribers → Paddle checkout overlay.
 * Existing Paddle subscribers switching Plus ↔ Pro → subscription update API (prorated).
 */
export function useBillingPlanAction() {
  const { openCheckout, checkoutReady } = usePaddleCheckout();

  const selectPlan = useCallback(
    async (params: { tier: PaddlePaidTier; period: BillingPeriod }) => {
      const targetPlan = params.tier.id;

      let snapshot: SubscriptionSnapshot = {};
      try {
        const res = await fetch("/api/billing/subscription");
        if (res.ok) {
          snapshot = (await res.json()) as SubscriptionSnapshot;
        }
      } catch {
        // Fall through to checkout when subscription fetch fails.
      }

      const currentTier = snapshot.effectiveTier ?? "free";
      const canChangePlan = Boolean(snapshot.canChangePlan);

      if (canChangePlan) {
        if (currentTier === targetPlan) {
          toast.message(`You're already on ${tierLabel(targetPlan)}.`);
          return { changed: true as const, plan: targetPlan };
        }
        if (
          (currentTier === "plus" && targetPlan === "pro") ||
          (currentTier === "pro" && targetPlan === "plus")
        ) {
          return { changed: false as const, needsConfirm: true as const, plan: targetPlan };
        }
      }

      if (hasMinTier(currentTier, targetPlan) && currentTier !== "free") {
        toast.message(`You're already on ${tierLabel(currentTier as "plus" | "pro")}.`);
        return { changed: false as const };
      }

      await openCheckout(params);
      return { changed: false as const };
    },
    [openCheckout]
  );

  const changePlan = useCallback(
    async (plan: "plus" | "pro") => {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Plan change failed");
      }
      return json;
    },
    []
  );

  const previewPlanChange = useCallback(async (plan: "plus" | "pro") => {
    const res = await fetch("/api/billing/change-plan/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = (await res.json()) as {
      error?: string;
      preview?: import("@/lib/services/billing/types").ChangePlanPreview;
    };
    if (!res.ok || !json.preview) {
      throw new Error(json.error ?? "Could not preview plan change");
    }
    return json.preview;
  }, []);

  return { selectPlan, changePlan, previewPlanChange, checkoutReady };
}
