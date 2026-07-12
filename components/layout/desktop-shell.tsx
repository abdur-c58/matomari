"use client";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { TutorPanelSlot } from "@/components/ai/tutor-provider";

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="desktop-app flex h-dvh min-h-0 w-full overflow-hidden">
      <DesktopSidebar />
      <div id="app-shell" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <main id="scrollable-content" className="scroll-touch">
          {children}
        </main>
      </div>
      <TutorPanelSlot />
    </div>
  );
}
