import { Suspense } from "react";
import { PathwayDetailScreen } from "@/components/study/pathway-detail-screen";
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

export default function PathwayDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PathwayDetailScreen />
    </Suspense>
  );
}
