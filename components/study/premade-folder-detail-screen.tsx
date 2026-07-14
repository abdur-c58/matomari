"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { StatusSections } from "@/components/islands/island-folder-section";
import { DecoratedStudySurface } from "@/components/study/decorated-study-surface";
import { Badge } from "@/components/ui/badge";
import {
  getIslandStudyUnits,
  groupStudyUnits,
} from "@/lib/services/study-unit-service";

export function PremadeFolderDetailScreen() {
  const params = useParams();
  const folderId = decodeURIComponent(String(params.id ?? ""));
  const { dataset, progress, premadeCatalog } = useApp();

  const folder = premadeCatalog?.folders.find((f) => f.id === folderId) ?? null;

  const folderUnits = useMemo(() => {
    if (!dataset || !premadeCatalog || !folder) return [];
    const assignments = premadeCatalog.islandFolderAssignments;
    return getIslandStudyUnits(dataset, progress, premadeCatalog).filter(
      (unit) =>
        unit.ref.kind === "island" &&
        unit.isPremade &&
        assignments[unit.ref.key] === folder.id
    );
  }, [dataset, progress, premadeCatalog, folder]);

  const grouped = useMemo(() => groupStudyUnits(folderUnits), [folderUnits]);
  const islandCount = folderUnits.length;

  if (!folder) {
    return (
      <AppGate>
        <PageShell className="md:max-w-6xl">
          <EmptyState
            title="Folder not found"
            description="This premade folder may have been removed."
            actionHref="/batch"
            actionLabel="Back to Islands"
          />
        </PageShell>
      </AppGate>
    );
  }

  return (
    <AppGate>
      <PageShell className="md:max-w-6xl">
        <div className="space-y-5">
          <Link
            href="/batch"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All islands
          </Link>

          <DecoratedStudySurface
            kanji={folder.themeKanji || "島"}
            className="rounded-xl border border-border/70"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-foreground">
                {folder.name}
              </h1>
              <Badge variant="secondary" className="text-[10px]">
                Premade
              </Badge>
            </div>
            {folder.description ? (
              <p className="mt-1 text-sm text-muted">{folder.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              {islandCount} {islandCount === 1 ? "island" : "islands"}
            </p>
          </DecoratedStudySurface>

          {islandCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No islands here yet.</p>
          ) : (
            <StatusSections
              grouped={grouped}
              folders={[]}
              showStatusHeaders={false}
            />
          )}
        </div>
      </PageShell>
    </AppGate>
  );
}
