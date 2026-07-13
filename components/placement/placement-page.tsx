"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { PlacementScreenMobile } from "@/components/mobile/placement-screen";
import { PlacementScreenDesktop } from "@/components/desktop/placement-screen-desktop";

export function PlacementPage() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <PlacementScreenMobile /> : <PlacementScreenDesktop />;
}
