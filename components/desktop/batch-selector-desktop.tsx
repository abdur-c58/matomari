"use client";

import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StudyUnitList } from "@/components/study/study-unit-list";

export function BatchSelectorDesktop() {
  return (
    <AppGate>
      <PageShell className="max-w-6xl">
        <PageHeader
          title="Scenes"
          subtitle="Browse premade themes and your own topic scenes in one place."
        />
        <StudyUnitList />
      </PageShell>
    </AppGate>
  );
}
