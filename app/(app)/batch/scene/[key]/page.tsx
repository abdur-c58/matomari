import { Suspense } from "react";
import { SceneDetailScreen } from "@/components/study/scene-detail-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

function Fallback() {
  return (
    <PageShell>
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </PageShell>
  );
}

export default function SceneDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SceneDetailScreen />
    </Suspense>
  );
}
