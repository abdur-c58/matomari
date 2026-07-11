import { Suspense } from "react";
import { PreferencesScreen } from "@/components/settings/preferences-screen";
import { LoadingState } from "@/components/layout/empty-state";

export default function PreferencesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PreferencesScreen />
    </Suspense>
  );
}
