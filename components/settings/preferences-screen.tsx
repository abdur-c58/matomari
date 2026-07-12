"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { PreferencesScreenMobile } from "@/components/mobile/preferences-screen";
import { PreferencesScreenDesktop } from "@/components/desktop/preferences-screen-desktop";

export function PreferencesScreen() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <PreferencesScreenMobile /> : <PreferencesScreenDesktop />;
}
