"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { TodayScreenMobile } from "@/components/mobile/today-screen";
import { TodayScreenDesktop } from "@/components/desktop/today-screen-desktop";

export function TodayScreen() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <TodayScreenMobile /> : <TodayScreenDesktop />;
}
