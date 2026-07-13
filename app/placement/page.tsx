import { Suspense } from "react";
import { PlacementPage } from "@/components/placement/placement-page";
import { LoadingState } from "@/components/layout/empty-state";

export default function PlacementRoute() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PlacementPage />
    </Suspense>
  );
}
