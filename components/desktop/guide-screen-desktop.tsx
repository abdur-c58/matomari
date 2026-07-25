import { GuideExperience } from "@/components/guide/guide-experience";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";

export function MethodGuideDesktop() {
  return (
    <DesktopPageShell fullWidth className="p-0">
      <GuideExperience />
    </DesktopPageShell>
  );
}
