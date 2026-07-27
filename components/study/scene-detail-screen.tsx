"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { StudyUnitDetailShell } from "@/components/study/study-unit-detail-shell";
import { premadeFolderHref } from "@/components/scenes/scene-folder-section";

export function SceneDetailScreen() {
  const params = useParams();
  const key = decodeURIComponent(String(params.key ?? ""));
  const { dataset, premadeCatalog } = useApp();
  const scene = dataset?.scenes[key];

  if (!scene) {
    return (
      <AppGate>
        <PageShell className="md:max-w-6xl">
          <EmptyState
            title="Scene not found"
            description="This scene may have been removed."
            actionHref="/batch"
            actionLabel="Back to Scenes"
          />
        </PageShell>
      </AppGate>
    );
  }

  const title = scene.title?.trim() || key.replace(/_/g, " ");
  const folderId = premadeCatalog?.sceneFolderAssignments[key];
  const folder = folderId
    ? premadeCatalog?.folders.find((f) => f.id === folderId)
    : null;

  return (
    <AppGate>
      <PageShell className="md:max-w-6xl">
        <StudyUnitDetailShell
          title={title}
          description={scene.description}
          sceneKey={key}
          showCustomSentence
          themeKanji={scene.themeKanji}
          backHref={folder ? premadeFolderHref(folder.id) : "/batch"}
          backLabel={folder ? folder.name : "All scenes"}
        />
      </PageShell>
    </AppGate>
  );
}
