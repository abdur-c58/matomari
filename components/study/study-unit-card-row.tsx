"use client";

import type { StudyUnitSummary } from "@/lib/services/study-unit-service";
import type { SceneFolder } from "@/types/progress";
import { StudyUnitCard } from "@/components/study/study-unit-card";
import { MoveSceneToFolderMenu } from "@/components/scenes/move-scene-to-folder-menu";

export function StudyUnitCardRow({
  unit,
  href,
  folders = [],
}: {
  unit: StudyUnitSummary;
  href: string;
  folders?: SceneFolder[];
}) {
  if (unit.isPathway || unit.ref.kind !== "scene" || unit.isPremade || unit.isShared) {
    return <StudyUnitCard unit={unit} href={href} />;
  }

  return (
    <div className="relative">
      <StudyUnitCard unit={unit} href={href} />
      <MoveSceneToFolderMenu
        sceneKey={unit.ref.key}
        isPremade={unit.isPremade}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-surface/80 backdrop-blur-sm"
      />
    </div>
  );
}
