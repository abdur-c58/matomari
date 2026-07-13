"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  filterStudyUnits,
  getStudyUnits,
  groupStudyUnits,
  studyUnitKey,
  type StudyUnitStatusFilter,
} from "@/lib/services/study-unit-service";
import { StudyUnitCard } from "@/components/study/study-unit-card";
import { CreateIslandDialog } from "@/components/ai/create-island-dialog";
import { CreateManualIslandDialog } from "@/components/islands/create-manual-island-dialog";
import { useEnsureIslandKanji } from "@/hooks/use-ensure-island-kanji";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: StudyUnitStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "untouched", label: "Untouched" },
  { value: "completed", label: "Completed" },
];

function unitHref(unit: ReturnType<typeof getStudyUnits>[number]) {
  return unit.ref.kind === "pathway"
    ? "/batch/pathway"
    : `/batch/island/${encodeURIComponent(unit.ref.key)}`;
}

export function StudyUnitList() {
  const { dataset, progress } = useApp();
  useEnsureIslandKanji();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudyUnitStatusFilter>("all");

  const allUnits = useMemo(
    () => (dataset ? getStudyUnits(dataset, progress) : []),
    [dataset, progress]
  );

  const filtered = useMemo(
    () => filterStudyUnits(allUnits, query, statusFilter),
    [allUnits, query, statusFilter]
  );

  const grouped = useMemo(() => groupStudyUnits(filtered), [filtered]);

  const renderUnit = (unit: (typeof allUnits)[number]) => (
    <StudyUnitCard
      key={studyUnitKey(unit.ref)}
      unit={unit}
      href={unitHref(unit)}
    />
  );

  if (!dataset) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search islands…"
          className="min-w-[12rem] flex-1 rounded-full border-border/70 bg-surface-raised"
        />
        <div className="inline-flex shrink-0 rounded-full border border-border/70 bg-surface-raised p-0.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={statusFilter === f.value ? "default" : "ghost"}
              className={cn(
                "h-8 rounded-full px-3 text-xs",
                statusFilter === f.value &&
                  "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              )}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <CreateIslandDialog compact />
        <CreateManualIslandDialog compact />
      </div>

      {statusFilter === "all" ? (
        <div className="space-y-5">
          {grouped.inProgress.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  In progress
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">{grouped.inProgress.map(renderUnit)}</div>
            </section>
          )}
          {grouped.untouched.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Untouched
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">{grouped.untouched.map(renderUnit)}</div>
            </section>
          )}
          {grouped.completed.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Completed
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">{grouped.completed.map(renderUnit)}</div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(renderUnit)}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No islands match.</p>
          )}
        </div>
      )}
    </div>
  );
}
