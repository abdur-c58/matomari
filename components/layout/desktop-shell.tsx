"use client";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { PageGradientMain } from "@/components/layout/page-gradient-main";
import { TutorPanelSlot } from "@/components/ai/tutor-provider";

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="desktop-app flex h-dvh min-h-0 w-full overflow-hidden">
      <DesktopSidebar />
      <div id="app-shell" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <PageGradientMain id="scrollable-content" className="scroll-touch">
          {children}
        </PageGradientMain>
      </div>
      <TutorPanelSlot />
    </div>
  );
}
