import { GuideExperience } from "@/components/guide/guide-experience";
import { PageShell } from "@/components/layout/page-shell";

export function MethodGuideMobile() {
  return (
    <PageShell className="max-w-none px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0">
      <GuideExperience />
    </PageShell>
  );
}
