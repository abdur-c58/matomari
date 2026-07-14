"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  filterStudyUnits,
  filterStudyUnitsByOrigin,
  getIslandStudyUnits,
  organizeStudyUnitsForDisplay,
  type IslandOriginFilter,
  type StudyUnitStatusFilter,
} from "@/lib/services/study-unit-service";
import { getUserFolders } from "@/lib/services/island-folder-service";
import { CreateIslandDialog } from "@/components/ai/create-island-dialog";
import { CreateManualIslandDialog } from "@/components/islands/create-manual-island-dialog";
import { CreateIslandFolderDialog } from "@/components/islands/create-island-folder-dialog";
import {
  IslandFolderSection,
  PremadeIslandFolderSection,
  UnfolderedStudyUnitsSection,
} from "@/components/islands/island-folder-section";
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

const ORIGIN_FILTERS: { value: IslandOriginFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "premade", label: "Premade" },
  { value: "user", label: "Mine" },
];

function hasGroupedUnits(grouped: {
  featured?: unknown[];
  inProgress: unknown[];
  untouched: unknown[];
  completed: unknown[];
}): boolean {
  return (
    (grouped.featured?.length ?? 0) > 0 ||
    grouped.inProgress.length > 0 ||
    grouped.untouched.length > 0 ||
    grouped.completed.length > 0
  );
}

export function StudyUnitList() {
  const { dataset, progress, premadeCatalog } = useApp();
  useEnsureIslandKanji();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudyUnitStatusFilter>("all");
  const [originFilter, setOriginFilter] = useState<IslandOriginFilter>("all");

  const allUnits = useMemo(
    () => (dataset ? getIslandStudyUnits(dataset, progress, premadeCatalog) : []),
    [dataset, progress, premadeCatalog]
  );

  const filtered = useMemo(() => {
    const byOrigin = filterStudyUnitsByOrigin(allUnits, originFilter);
    return filterStudyUnits(byOrigin, query, statusFilter);
  }, [allUnits, originFilter, query, statusFilter]);

  const organized = useMemo(
    () =>
      dataset
        ? organizeStudyUnitsForDisplay(filtered, progress, dataset, premadeCatalog)
        : null,
    [filtered, progress, dataset, premadeCatalog]
  );

  const userFolders = getUserFolders(progress);
  const showStatusHeaders = statusFilter === "all";
  const showUserActions = originFilter !== "premade";

  if (!dataset || !organized) return null;

  const hasContent =
    organized.premadeFolders.length > 0 ||
    hasGroupedUnits(organized.premadeUnfoldered) ||
    organized.userFolders.length > 0 ||
    hasGroupedUnits(organized.unfoldered);

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
          {ORIGIN_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={originFilter === f.value ? "default" : "ghost"}
              className={cn(
                "h-8 rounded-full px-3 text-xs",
                originFilter === f.value &&
                  "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              )}
              onClick={() => setOriginFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
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
        {showUserActions && (
          <>
            <CreateIslandFolderDialog compact />
            <CreateIslandDialog compact />
            <CreateManualIslandDialog compact />
          </>
        )}
      </div>

      <div className="space-y-5">
        {organized.premadeFolders.map(({ folder, grouped }) => (
          <PremadeIslandFolderSection
            key={folder.id}
            folder={folder}
            grouped={grouped}
          />
        ))}

        <UnfolderedStudyUnitsSection
          grouped={organized.premadeUnfoldered}
          folders={[]}
          showStatusHeaders={showStatusHeaders}
          title="Other premade islands"
        />

        {organized.userFolders.map(({ folder, grouped }) => (
          <IslandFolderSection
            key={folder.id}
            folder={folder}
            grouped={grouped}
            folders={userFolders}
            showStatusHeaders={showStatusHeaders}
          />
        ))}

        <UnfolderedStudyUnitsSection
          grouped={organized.unfoldered}
          folders={userFolders}
          showStatusHeaders={showStatusHeaders}
        />

        {!hasContent && (
          <p className="py-8 text-center text-sm text-muted">No islands match.</p>
        )}
      </div>
    </div>
  );
}
