"use client";

import { AppBrandHeader } from "@/components/layout/app-brand-header";
import { MobileSideNav } from "@/components/layout/mobile-side-nav";
import { PageGradientMain } from "@/components/layout/page-gradient-main";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="app-shell"
      className="flex min-h-dvh flex-col bg-background text-foreground"
    >
      <PageGradientMain id="scrollable-content" className="flex-1">
        <div className="mobile-top-bar shrink-0 bg-background">
          <div className="pt-[env(safe-area-inset-top,0px)]">
            <div className="flex min-h-12 items-center px-4 py-2.5 pr-12">
              <AppBrandHeader variant="mobile" />
            </div>
          </div>
        </div>
        {children}
      </PageGradientMain>
      <MobileSideNav />
    </div>
  );
}
