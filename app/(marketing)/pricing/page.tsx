import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { PricingPageExperience } from "@/components/marketing/pricing-page";
import { getPaddleCatalogTiers } from "@/lib/constants/paddle-tiers";
import { countryFromRequestHeaders } from "@/lib/paddle/country-from-headers";
import { APP_NAME } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: `Pricing — ${APP_NAME}`,
  description: `Free, Plus, and Pro plans for ${APP_NAME}. Localized Paddle checkout.`,
};

export default async function PricingPage() {
  const countryCode = countryFromRequestHeaders(await headers());
  const tiers = getPaddleCatalogTiers();

  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm text-muted">Loading pricing…</div>
      }
    >
      <PricingPageExperience tiers={tiers} countryCode={countryCode} />
    </Suspense>
  );
}
