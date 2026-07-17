import { Suspense } from "react";
import { ActiveRecallMode } from "@/components/recall/active-recall-mode";
import { LoadingState } from "@/components/layout/empty-state";

export default function RecallPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ActiveRecallMode />
    </Suspense>
  );
}
