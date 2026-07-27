/**
 * Single source of truth for published tier prices.
 * Display helpers keep monthly/annual copy and savings in one place.
 *
 * Paddle Price IDs come from env (never hardcoded). Catalog amounts should match:
 *   Plus monthly  $8.99
 *   Plus annual   $89.99
 *   Pro monthly   $17.99
 *   Pro annual    $179.99
 */

export const PLUS_PRICE_MONTHLY_USD = 8.99;
export const PLUS_PRICE_ANNUAL_USD = 89.99;
/** Displayed annual savings vs 12× monthly (≈ $18). */
export const PLUS_ANNUAL_SAVINGS_USD = 18;

export const PRO_PRICE_MONTHLY_USD = 17.99;
export const PRO_PRICE_ANNUAL_USD = 179.99;
/** Displayed annual savings vs 12× monthly (≈ $36). */
export const PRO_ANNUAL_SAVINGS_USD = 36;

/** Reference unit amounts in USD cents (for docs / catalog setup). */
export const PADDLE_PRICE_AMOUNT_CENTS = {
  plusMonthly: 899,
  plusAnnual: 8999,
  proMonthly: 1799,
  proAnnual: 17999,
} as const;

export type BillingPeriod = "monthly" | "annual";
export type BillingInterval = BillingPeriod;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Resolve Paddle Price ID for a paid plan + billing interval. */
export function paddlePriceIdForPlan(
  plan: "plus" | "pro",
  interval: BillingInterval
): string {
  if (plan === "pro") {
    return interval === "annual"
      ? requireEnv("PADDLE_PRICE_PRO_ANNUAL")
      : requireEnv("PADDLE_PRICE_PRO_MONTHLY");
  }
  return interval === "annual"
    ? requireEnv("PADDLE_PRICE_PLUS_ANNUAL")
    : requireEnv("PADDLE_PRICE_PLUS_MONTHLY");
}

/** Map a Paddle Price ID back to Plus/Pro (null if unknown). */
export function tierFromPaddlePriceId(
  priceId: string | null | undefined
): "plus" | "pro" | null {
  if (!priceId) return null;
  const map: Record<string, "plus" | "pro"> = {};
  const pairs: Array<[string | undefined, "plus" | "pro"]> = [
    [process.env.PADDLE_PRICE_PLUS_MONTHLY, "plus"],
    [process.env.PADDLE_PRICE_PLUS_ANNUAL, "plus"],
    [process.env.PADDLE_PRICE_PRO_MONTHLY, "pro"],
    [process.env.PADDLE_PRICE_PRO_ANNUAL, "pro"],
  ];
  for (const [id, tier] of pairs) {
    if (id?.trim()) map[id.trim()] = tier;
  }
  return map[priceId] ?? null;
}

export function formatUsd(amount: number): string {
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function paidPlanMonthlyLabel(plan: "plus" | "pro"): string {
  return formatUsd(
    plan === "pro" ? PRO_PRICE_MONTHLY_USD : PLUS_PRICE_MONTHLY_USD
  );
}

export function paidPlanAnnualLabel(plan: "plus" | "pro"): string {
  const annual =
    plan === "pro" ? PRO_PRICE_ANNUAL_USD : PLUS_PRICE_ANNUAL_USD;
  const savings =
    plan === "pro" ? PRO_ANNUAL_SAVINGS_USD : PLUS_ANNUAL_SAVINGS_USD;
  return `${formatUsd(annual)}/yr — save $${savings}`;
}

export function paidPlanPriceDisplay(
  plan: "plus" | "pro",
  period: BillingPeriod
): {
  headlineMonthly: number;
  headlineLabel: string;
  billed: string;
  saving?: string;
} {
  if (plan === "pro") {
    if (period === "annual") {
      return {
        headlineMonthly: Math.round((PRO_PRICE_ANNUAL_USD / 12) * 100) / 100,
        headlineLabel: formatUsd(
          Math.round((PRO_PRICE_ANNUAL_USD / 12) * 100) / 100
        ),
        billed: paidPlanAnnualLabel("pro"),
        saving: `Save $${PRO_ANNUAL_SAVINGS_USD}`,
      };
    }
    return {
      headlineMonthly: PRO_PRICE_MONTHLY_USD,
      headlineLabel: formatUsd(PRO_PRICE_MONTHLY_USD),
      billed: "Billed monthly",
    };
  }

  if (period === "annual") {
    return {
      headlineMonthly: Math.round((PLUS_PRICE_ANNUAL_USD / 12) * 100) / 100,
      headlineLabel: formatUsd(
        Math.round((PLUS_PRICE_ANNUAL_USD / 12) * 100) / 100
      ),
      billed: paidPlanAnnualLabel("plus"),
      saving: `Save $${PLUS_ANNUAL_SAVINGS_USD}`,
    };
  }

  return {
    headlineMonthly: PLUS_PRICE_MONTHLY_USD,
    headlineLabel: formatUsd(PLUS_PRICE_MONTHLY_USD),
    billed: "Billed monthly",
  };
}
