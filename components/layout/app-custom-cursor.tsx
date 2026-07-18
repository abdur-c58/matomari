"use client";

import { MarketingCustomCursor } from "@/components/marketing/custom-cursor";
import { useApp } from "@/components/providers/app-provider";

/** Custom cursor for authenticated app routes — respects the standard-cursor preference. */
export function AppCustomCursor() {
  const { progress } = useApp();
  if (progress.settings.useStandardCursor) return null;
  return <MarketingCustomCursor />;
}
