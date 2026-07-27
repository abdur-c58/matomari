import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import {
  BILLING_SIMULATION_MODE,
  computeEffectiveTier,
  getUserSubscriptionAdmin,
} from "@/lib/services/billing";
import {
  getEntitlementCaps,
  PLUS_PRICE_MONTHLY_USD,
  PRO_PRICE_MONTHLY_USD,
} from "@/lib/constants/entitlements";
import { formatUsd } from "@/lib/constants/pricing";

export async function GET() {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const subscription = await getUserSubscriptionAdmin(user.userId);
  const effectiveTier = computeEffectiveTier(subscription);
  const caps = getEntitlementCaps(effectiveTier);

  return NextResponse.json({
    simulation: BILLING_SIMULATION_MODE,
    plusPriceMonthly: PLUS_PRICE_MONTHLY_USD,
    proPriceMonthly: PRO_PRICE_MONTHLY_USD,
    plusPriceLabel: formatUsd(PLUS_PRICE_MONTHLY_USD),
    proPriceLabel: formatUsd(PRO_PRICE_MONTHLY_USD),
    subscription,
    effectiveTier,
    caps,
  });
}
