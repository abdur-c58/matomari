"use client";

import { ProgressStats } from "@/components/progress/progress-stats";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useSceneAccess } from "@/hooks/use-scene-access";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";

export default function ProgressPage() {
  const { allowsDeeperProgress, loaded } = useSceneAccess();

  if (loaded && !allowsDeeperProgress) {
    return (
      <DesktopPageShell className="max-w-lg">
        <UpgradePrompt
          title="Deeper progress is on Plus"
          description="Charts for mastery, weak trends, and study time unlock with Plus or Pro — the daily loop still works on Free."
          href="/billing/checkout?plan=plus"
          ctaLabel="Upgrade to Plus"
        />
      </DesktopPageShell>
    );
  }

  return <ProgressStats />;
}
