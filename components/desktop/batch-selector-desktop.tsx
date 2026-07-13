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
          title="Islands"
          subtitle="Browse the main pathway and your topic islands in one place."
        />
        <StudyUnitList />
      </PageShell>
    </AppGate>
  );
}
