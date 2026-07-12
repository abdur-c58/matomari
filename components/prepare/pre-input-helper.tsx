"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { PreInputHelperMobile } from "@/components/mobile/pre-input-helper";
import { PreInputHelperDesktop } from "@/components/desktop/prepare-screen-desktop";

export function PreInputHelper() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <PreInputHelperMobile /> : <PreInputHelperDesktop />;
}
