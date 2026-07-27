import { Suspense } from "react";
import { SharedScenePreviewScreen } from "@/components/scenes/shared-scene-preview-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

function Fallback() {
  return (
    <PageShell className="md:max-w-xl">
      <Skeleton className="mb-4 h-8 w-40" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </PageShell>
  );
}

export default function SharedScenePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SharedScenePreviewScreen />
    </Suspense>
  );
}
