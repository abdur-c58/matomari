"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PlacementFlow } from "@/components/placement/placement-flow";

export function PlacementScreenMobile() {
  return (
    <PageShell className="max-w-lg">
      <PlacementFlow />
    </PageShell>
  );
}
