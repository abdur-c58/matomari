"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { StudyUnitDetailShell } from "@/components/study/study-unit-detail-shell";
import { premadeFolderHref } from "@/components/islands/island-folder-section";

export function IslandDetailScreen() {
  const params = useParams();
  const key = decodeURIComponent(String(params.key ?? ""));
  const { dataset, premadeCatalog } = useApp();
  const island = dataset?.islands[key];

  if (!island) {
    return (
      <AppGate>
        <PageShell className="md:max-w-6xl">
          <EmptyState
            title="Island not found"
            description="This island may have been removed."
            actionHref="/batch"
            actionLabel="Back to Islands"
          />
        </PageShell>
      </AppGate>
    );
  }

  const title = island.title?.trim() || key.replace(/_/g, " ");
  const folderId = premadeCatalog?.islandFolderAssignments[key];
  const folder = folderId
    ? premadeCatalog?.folders.find((f) => f.id === folderId)
    : null;

  return (
    <AppGate>
      <PageShell className="md:max-w-6xl">
        <StudyUnitDetailShell
          title={title}
          description={island.description}
          islandKey={key}
          showCustomSentence
          themeKanji={island.themeKanji}
          backHref={folder ? premadeFolderHref(folder.id) : "/batch"}
          backLabel={folder ? folder.name : "All islands"}
        />
      </PageShell>
    </AppGate>
  );
}
