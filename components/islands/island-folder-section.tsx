"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  countIslandsInFolder,
  deleteIslandFolder,
} from "@/lib/services/island-folder-service";
import type { GroupedStudyUnits } from "@/lib/services/study-unit-service";
import { studyUnitKey } from "@/lib/services/study-unit-service";
import type { IslandFolder } from "@/types/progress";
import type { PremadeFolder } from "@/types/premade-catalog";
import { CreateIslandFolderDialog } from "@/components/islands/create-island-folder-dialog";
import { StudyUnitCardRow } from "@/components/study/study-unit-card-row";
import { DecoratedStudySurface } from "@/components/study/decorated-study-surface";
import { BufferedListSentinel } from "@/components/ui/buffered-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBufferedVisibleCount } from "@/hooks/use-buffered-visible-count";
import { cn } from "@/lib/utils";

export function premadeFolderHref(folderId: string) {
  return `/batch/folder/${encodeURIComponent(folderId)}`;
}

function unitHref(unit: GroupedStudyUnits["inProgress"][number]) {
  if (unit.ref.kind === "pathway") return "/batch";
  return `/batch/island/${encodeURIComponent(unit.ref.key)}`;
}

const ISLAND_INITIAL = 24;
const ISLAND_STEP = 16;
const ISLAND_MARGIN_PX = 900;

function BufferedUnitList({
  units,
  folders,
  resetKey,
  spacingClass,
}: {
  units: GroupedStudyUnits["inProgress"];
  folders: IslandFolder[];
  resetKey: string;
  spacingClass: string;
}) {
  const { visibleCount, hasMore, sentinelRef } = useBufferedVisibleCount(
    units.length,
    {
      initial: ISLAND_INITIAL,
      step: ISLAND_STEP,
      rootMarginPx: ISLAND_MARGIN_PX,
      resetKey,
    }
  );

  const visible = useMemo(
    () => units.slice(0, visibleCount),
    [units, visibleCount]
  );

  return (
    <div className={spacingClass}>
      {visible.map((unit) => (
        <StudyUnitCardRow
          key={studyUnitKey(unit.ref)}
          unit={unit}
          href={unitHref(unit)}
          folders={folders}
        />
      ))}
      <BufferedListSentinel
        hasMore={hasMore}
        sentinelRef={sentinelRef}
        remaining={units.length - visibleCount}
      />
    </div>
  );
}

export function StatusSections({
  grouped,
  folders,
  showStatusHeaders,
}: {
  grouped: GroupedStudyUnits;
  folders: IslandFolder[];
  showStatusHeaders: boolean;
}) {
  const sectionResetKey = useMemo(
    () =>
      [
        grouped.featured.length,
        grouped.inProgress.length,
        grouped.untouched.length,
        grouped.completed.length,
        grouped.featured[0]?.ref.kind === "island"
          ? grouped.featured[0]?.ref.key
          : "",
        grouped.inProgress[0]?.ref.kind === "island"
          ? grouped.inProgress[0]?.ref.key
          : "",
      ].join("|"),
    [grouped]
  );

  const sections: { key: keyof GroupedStudyUnits; label: string | null }[] = [
    { key: "featured", label: null },
    { key: "inProgress", label: "In progress" },
    { key: "untouched", label: "Untouched" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-3">
      {sections.map(({ key, label }) => {
        const units = grouped[key];
        if (units.length === 0) return null;
        const hasContentBelow =
          key === "featured" &&
          (grouped.inProgress.length > 0 ||
            grouped.untouched.length > 0 ||
            grouped.completed.length > 0);
        return (
          <section
            key={key}
            className={cn("space-y-3", hasContentBelow && "mb-8")}
          >
            {showStatusHeaders && label && (
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {label}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <BufferedUnitList
              units={units}
              folders={folders}
              resetKey={`${sectionResetKey}:${key}`}
              spacingClass={key === "featured" ? "space-y-5" : "space-y-3"}
            />
          </section>
        );
      })}
    </div>
  );
}

export function PremadeIslandFolderSection({
  folder,
  grouped,
}: {
  folder: PremadeFolder;
  grouped: GroupedStudyUnits;
}) {
  const islandCount = countIslandsInFolder(grouped);

  return (
    <section>
      <Link
        href={premadeFolderHref(folder.id)}
        className="block rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DecoratedStudySurface
          kanji={folder.themeKanji || "島"}
          className="rounded-xl border border-border/70"
        >
          <div className="flex items-start gap-2 px-3 py-2.5">
            <Folder className="mt-1 h-4 w-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-foreground">
                  {folder.name}
                </span>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Premade
                </Badge>
                <span className="shrink-0 text-xs text-muted">
                  {islandCount} {islandCount === 1 ? "island" : "islands"}
                </span>
              </div>
              {folder.description ? (
                <p className="mt-0.5 text-xs text-muted">{folder.description}</p>
              ) : null}
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
          </div>
        </DecoratedStudySurface>
      </Link>
    </section>
  );
}

export function IslandFolderSection({
  folder,
  grouped,
  folders,
  showStatusHeaders = true,
}: {
  folder: IslandFolder;
  grouped: GroupedStudyUnits;
  folders: IslandFolder[];
  showStatusHeaders?: boolean;
}) {
  const { setProgress } = useApp();
  const [expanded, setExpanded] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const islandCount = countIslandsInFolder(grouped);

  const handleDelete = () => {
    setProgress((prev) => deleteIslandFolder(prev, folder.id));
    setDeleteOpen(false);
  };

  return (
    <section>
      <DecoratedStudySurface
        kanji="島"
        className="rounded-xl border border-border/70"
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted transition-transform",
                !expanded && "-rotate-90"
              )}
            />
            <Folder className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate font-semibold text-foreground">{folder.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {islandCount} {islandCount === 1 ? "island" : "islands"}
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Rename folder"
            onClick={() => setRenameOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            aria-label="Delete folder"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="space-y-4 border-t border-border/50 px-3 py-3">
            <StatusSections
              grouped={grouped}
              folders={folders}
              showStatusHeaders={showStatusHeaders}
            />
          </div>
        )}
      </DecoratedStudySurface>

      <CreateIslandFolderDialog
        mode="rename"
        folderId={folder.id}
        initialName={folder.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              &ldquo;{folder.name}&rdquo; will be removed. Islands in this folder will
              move to Other islands.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function UnfolderedStudyUnitsSection({
  grouped,
  folders,
  showStatusHeaders = true,
  title = "Other islands",
}: {
  grouped: GroupedStudyUnits;
  folders: IslandFolder[];
  showStatusHeaders?: boolean;
  title?: string;
}) {
  const hasUnits =
    grouped.featured.length > 0 ||
    grouped.inProgress.length > 0 ||
    grouped.untouched.length > 0 ||
    grouped.completed.length > 0;

  if (!hasUnits) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <StatusSections
        grouped={grouped}
        folders={folders}
        showStatusHeaders={showStatusHeaders}
      />
    </section>
  );
}
