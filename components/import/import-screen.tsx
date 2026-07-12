"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { ImportScreenMobile } from "@/components/mobile/import-screen";
import { ImportScreenDesktop } from "@/components/desktop/import-screen-desktop";

export function ImportScreen() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <ImportScreenMobile /> : <ImportScreenDesktop />;
}
