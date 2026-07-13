"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { StudyUnitDetailShell } from "@/components/study/study-unit-detail-shell";
import { EmptyState } from "@/components/layout/empty-state";

export function IslandDetailScreen() {
  const params = useParams();
  const key = decodeURIComponent(String(params.key ?? ""));
  const { dataset } = useApp();
  const island = dataset?.islands[key];

  if (!island) {
    return (
      <AppGate>
        <PageShell className="md:max-w-6xl">
          <EmptyState
            title="Island not found"
            description="This island may have been removed."
            actionHref="/batch"
            actionLabel="Back to Islands"
          />
        </PageShell>
      </AppGate>
    );
  }

  const title = key.replace(/_/g, " ");

  return (
    <AppGate>
      <PageShell className="md:max-w-6xl">
        <StudyUnitDetailShell
          title={title}
          description={island.description}
          islandKey={key}
          showCustomSentence
          themeKanji={island.themeKanji}
        />
      </PageShell>
    </AppGate>
  );
}
