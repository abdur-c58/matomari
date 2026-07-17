"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/app-provider";
import { getStudyFlowState } from "@/lib/services/study-flow-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StudyFlowNextStepProps = {
  completedTitle?: string;
  completedDescription?: string;
  className?: string;
};

export function StudyFlowNextStep({
  completedTitle = "Nice work!",
  completedDescription = "You finished this step.",
  className,
}: StudyFlowNextStepProps) {
  const { dataset, progress, stats } = useApp();
  const flow = dataset ? getStudyFlowState(dataset, progress, stats) : null;

  return (
    <Card className={className ?? "p-6 text-center"}>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {completedTitle}
      </h2>
      <p className="mt-2 text-sm text-muted">{completedDescription}</p>

      {flow && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={flow.nextHref}>{flow.nextLabel}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/today">Back to Dashboard</Link>
          </Button>
        </div>
      )}

      {!flow && (
        <Button className="mt-6" variant="secondary" asChild>
          <Link href="/today">Back to Dashboard</Link>
        </Button>
      )}
    </Card>
  );
}
