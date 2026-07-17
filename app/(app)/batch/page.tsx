import { Suspense } from "react";
import { BatchSelector } from "@/components/batch/batch-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

function BatchFallback() {
  return (
    <PageShell>
      <Skeleton className="mb-4 h-8 w-24" />
      <Skeleton className="mb-6 h-12 w-full" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </PageShell>
  );
}

export default function BatchPage() {
  return (
    <Suspense fallback={<BatchFallback />}>
      <BatchSelector />
    </Suspense>
  );
}
