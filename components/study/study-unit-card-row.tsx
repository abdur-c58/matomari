"use client";

import type { StudyUnitSummary } from "@/lib/services/study-unit-service";
import type { IslandFolder } from "@/types/progress";
import { StudyUnitCard } from "@/components/study/study-unit-card";
import { MoveIslandToFolderMenu } from "@/components/islands/move-island-to-folder-menu";

export function StudyUnitCardRow({
  unit,
  href,
  folders = [],
}: {
  unit: StudyUnitSummary;
  href: string;
  folders?: IslandFolder[];
}) {
  if (unit.isPathway || unit.ref.kind !== "island" || unit.isPremade) {
    return <StudyUnitCard unit={unit} href={href} />;
  }

  return (
    <div className="relative">
      <StudyUnitCard unit={unit} href={href} />
      <MoveIslandToFolderMenu
        islandKey={unit.ref.key}
        isPremade={unit.isPremade}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-surface/80 backdrop-blur-sm"
      />
    </div>
  );
}
