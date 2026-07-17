import { Suspense } from "react";
import { PremadeFolderDetailScreen } from "@/components/study/premade-folder-detail-screen";
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

export default function PremadeFolderDetailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PremadeFolderDetailScreen />
    </Suspense>
  );
}
