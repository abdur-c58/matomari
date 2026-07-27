import { Suspense } from "react";
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading settings…</div>}>
      <SettingsScreen />
    </Suspense>
  );
}
