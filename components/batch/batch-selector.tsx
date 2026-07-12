"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { BatchSelectorMobile } from "@/components/mobile/batch-selector";
import { BatchSelectorDesktop } from "@/components/desktop/batch-selector-desktop";

export function BatchSelector() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <BatchSelectorMobile /> : <BatchSelectorDesktop />;
}
