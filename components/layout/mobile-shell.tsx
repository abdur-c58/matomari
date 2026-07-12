"use client";

import { AppBrandHeader } from "@/components/layout/app-brand-header";
import { MobileSideNav } from "@/components/layout/mobile-side-nav";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <div
        id="app-shell"
        className="flex min-h-0 flex-1 flex-col bg-background text-foreground"
      >
        <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background">
          <div className="pt-[env(safe-area-inset-top,0px)]">
            <div className="flex min-h-12 items-center px-4 py-2.5 pr-12">
              <AppBrandHeader variant="mobile" />
            </div>
          </div>
        </header>
        <main id="scrollable-content" className="scroll-touch">
          {children}
        </main>
        <MobileSideNav />
      </div>
    </div>
  );
}
