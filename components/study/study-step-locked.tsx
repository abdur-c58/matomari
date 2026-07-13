"use client";

import { EmptyState } from "@/components/layout/empty-state";

export function StudyStepLocked({
  lockedReason,
  continueHref,
}: {
  lockedReason: string;
  continueHref: string;
}) {
  return (
    <EmptyState
      title="Complete the previous step first"
      description={lockedReason}
      actionHref={continueHref}
      actionLabel="Continue today's plan"
    />
  );
}
