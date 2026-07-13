import { Suspense } from "react";
import { IslandDetailScreen } from "@/components/study/island-detail-screen";
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

export default function IslandDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <IslandDetailScreen />
    </Suspense>
  );
}
