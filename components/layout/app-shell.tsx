"use client";

import { MobileShell } from "@/components/layout/mobile-shell";
import { DesktopShell } from "@/components/layout/desktop-shell";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  return <DesktopShell>{children}</DesktopShell>;
}
