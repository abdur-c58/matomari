"use client";

import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { PlacementFlow } from "@/components/placement/placement-flow";

export function PlacementScreenDesktop() {
  return (
    <DesktopPageShell className="max-w-none px-0 pt-0">
      <div className="mx-auto w-full max-w-xl px-8 py-8">
        <PlacementFlow />
      </div>
    </DesktopPageShell>
  );
}
