"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { SettingsScreenMobile } from "@/components/mobile/settings-screen";
import { SettingsScreenDesktop } from "@/components/desktop/settings-screen-desktop";

export function SettingsScreen() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <SettingsScreenMobile /> : <SettingsScreenDesktop />;
}
