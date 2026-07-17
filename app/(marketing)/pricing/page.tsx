import type { Metadata } from "next";
import { PricingPageExperience } from "@/components/marketing/pricing-page";
import { APP_NAME } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: `Pricing preview — ${APP_NAME}`,
  description: `A dummy Free and Plus pricing concept for ${APP_NAME}.`,
};

export default function PricingPage() {
  return <PricingPageExperience />;
}
