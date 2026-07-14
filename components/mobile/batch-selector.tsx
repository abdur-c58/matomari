"use client";

import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StudyUnitList } from "@/components/study/study-unit-list";

export function BatchSelectorMobile() {
  return (
    <AppGate>
      <PageShell>
        <PageHeader title="Islands" subtitle="Browse premade themes and your own islands." />
        <StudyUnitList />
      </PageShell>
    </AppGate>
  );
}
