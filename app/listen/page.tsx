import { Suspense } from "react";
import { ListenPage } from "@/components/listen/listen-page";
import { LoadingState } from "@/components/layout/empty-state";

export default function ListenRoute() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ListenPage />
    </Suspense>
  );
}
