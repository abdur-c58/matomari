"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { usePaddle } from "@/components/billing/paddle-provider";
import type { PaddlePaidTier } from "@/lib/constants/paddle-tiers";
import type { BillingPeriod } from "@/lib/constants/pricing";

const GOOGLE_AUTH_PARAMS = { prompt: "select_account" } as const;

export function usePaddleCheckout() {
  const { paddle, ready } = usePaddle();
  const { data: session, status } = useSession();

  const openCheckout = useCallback(
    async (params: {
      tier: PaddlePaidTier;
      period: BillingPeriod;
      returnPath?: string;
    }) => {
      if (!ready || !paddle) {
        toast.error("Checkout is still loading. Try again in a moment.");
        return;
      }

      const intervalKey = params.period === "annual" ? "year" : "month";
      const priceId = params.tier.priceId[intervalKey];
      const returnPath = params.returnPath ?? "/pricing";

      if (status !== "authenticated" || !session?.user?.supabaseUserId) {
        const redirectTo = `${returnPath}?plan=${params.tier.id}&interval=${params.period}`;
        await signIn("google", { redirectTo }, GOOGLE_AUTH_PARAMS);
        return;
      }

      const email = session.user.email?.trim();
      if (!email) {
        toast.error("Your account needs an email address to subscribe.");
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const successUrl = `${origin}/welcome`;

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        customData: {
          userId: session.user.supabaseUserId,
          plan: params.tier.id,
          interval: params.period,
        },
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl,
        },
      });
    },
    [paddle, ready, session, status]
  );

  return { openCheckout, checkoutReady: ready };
}
