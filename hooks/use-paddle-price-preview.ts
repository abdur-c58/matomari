"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PricePreviewResponse } from "@paddle/paddle-js";
import {
  isPaidTier,
  type PaddleCatalogTier,
  type PaidPlanId,
} from "@/lib/constants/paddle-tiers";
import { usePaddle } from "@/components/billing/paddle-provider";
import type { BillingPeriod } from "@/lib/constants/pricing";
import {
  priceDisplayParts,
  type PriceDisplayParts,
} from "@/lib/paddle/price-display";

export type PaddleTierPrice = {
  total: string;
  billingLabel: string;
  /** Raw total from Paddle (`totals.total`) — used only for count-up interpolation. */
  amount: number;
  displayParts: PriceDisplayParts;
};

type PeriodPriceMap = Partial<Record<PaidPlanId, PaddleTierPrice>>;
type PriceCache = Partial<Record<BillingPeriod, PeriodPriceMap>>;

function billingLabelFromPreview(
  lineItem: PricePreviewResponse["data"]["details"]["lineItems"][number]
): string {
  const cycle = lineItem.price.billingCycle;
  if (!cycle) return "";
  const { interval, frequency } = cycle;
  if (interval === "year") {
    return frequency === 1 ? "Billed yearly" : `Billed every ${frequency} years`;
  }
  if (interval === "month") {
    return frequency === 1 ? "Billed monthly" : `Billed every ${frequency} months`;
  }
  if (interval === "week") {
    return frequency === 1 ? "Billed weekly" : `Billed every ${frequency} weeks`;
  }
  return frequency === 1 ? "Billed daily" : `Billed every ${frequency} days`;
}

function mapPreviewToPrices(
  preview: PricePreviewResponse,
  priceIds: Array<{ tierId: PaidPlanId; priceId: string }>
): PeriodPriceMap {
  const byPriceId = new Map(
    preview.data.details.lineItems.map((line) => [line.price.id, line])
  );

  const next: PeriodPriceMap = {};
  for (const { tierId, priceId } of priceIds) {
    const line = byPriceId.get(priceId);
    if (!line) continue;
    const rawTotal = line.totals.total;
    const formattedTotal = line.formattedTotals.total;
    next[tierId] = {
      total: formattedTotal,
      billingLabel: billingLabelFromPreview(line),
      amount: parseFloat(rawTotal),
      displayParts: priceDisplayParts(formattedTotal, rawTotal),
    };
  }
  return next;
}

const BILLING_PERIODS: BillingPeriod[] = ["monthly", "annual"];

export function usePaddlePricePreview(params: {
  tiers: PaddleCatalogTier[];
  period: BillingPeriod;
  countryCode?: string;
  enabled?: boolean;
}) {
  const { paddle, ready } = usePaddle();
  const enabled = params.enabled !== false;
  const [cache, setCache] = useState<PriceCache>({});
  const [loadingPeriods, setLoadingPeriods] = useState<
    Partial<Record<BillingPeriod, boolean>>
  >({ monthly: true, annual: true });
  const [error, setError] = useState<string | null>(null);
  const fetchGeneration = useRef(0);

  const paidTiers = useMemo(
    () => params.tiers.filter(isPaidTier),
    [params.tiers]
  );

  const priceIdsForPeriod = useCallback(
    (period: BillingPeriod) => {
      const intervalKey = period === "annual" ? "year" : "month";
      return paidTiers.map((tier) => ({
        tierId: tier.id,
        priceId: tier.priceId[intervalKey],
      }));
    },
    [paidTiers]
  );

  const fetchPeriod = useCallback(
    async (period: BillingPeriod, generation: number) => {
      if (!paddle || !ready) return;

      setLoadingPeriods((prev) => ({ ...prev, [period]: true }));

      try {
        const priceIds = priceIdsForPeriod(period).filter((p) => p.priceId);
        if (priceIds.length === 0) {
          setLoadingPeriods((prev) => ({ ...prev, [period]: false }));
          return;
        }
        const preview = await paddle.PricePreview({
          items: priceIds.map(({ priceId }) => ({ priceId, quantity: 1 })),
          ...(params.countryCode
            ? { address: { countryCode: params.countryCode } }
            : {}),
        });

        if (generation !== fetchGeneration.current) return;

        const mapped = mapPreviewToPrices(preview, priceIds);
        setCache((prev) => ({ ...prev, [period]: mapped }));
        setError(null);
      } catch (err) {
        if (generation !== fetchGeneration.current) return;
        setError(
          err instanceof Error ? err.message : "Could not load localized prices"
        );
      } finally {
        if (generation === fetchGeneration.current) {
          setLoadingPeriods((prev) => ({ ...prev, [period]: false }));
        }
      }
    },
    [paddle, ready, priceIdsForPeriod, params.countryCode]
  );

  useEffect(() => {
    if (!enabled) return;
    if (!ready || !paddle) return;

    const generation = ++fetchGeneration.current;
    setCache({});
    setError(null);
    setLoadingPeriods({ monthly: true, annual: true });

    void Promise.all(
      BILLING_PERIODS.map((period) => fetchPeriod(period, generation))
    );
  }, [paddle, ready, fetchPeriod, enabled]);

  const prices = enabled ? (cache[params.period] ?? {}) : {};
  const loading = enabled ? (loadingPeriods[params.period] ?? true) : false;
  const initialLoading =
    enabled && BILLING_PERIODS.some((p) => loadingPeriods[p]);

  return {
    prices,
    loading,
    initialLoading,
    error,
    refetch: () => {
      const generation = ++fetchGeneration.current;
      void Promise.all(
        BILLING_PERIODS.map((period) => fetchPeriod(period, generation))
      );
    },
  };
}
