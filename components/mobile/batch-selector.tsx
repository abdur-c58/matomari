"use client";

import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StudyUnitList } from "@/components/study/study-unit-list";

export function BatchSelectorMobile() {
  return (
    <AppGate>
      <PageShell>
        <PageHeader title="Islands" subtitle="Browse islands and the main pathway." />
        <StudyUnitList />
      </PageShell>
    </AppGate>
  );
}
