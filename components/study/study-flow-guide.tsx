"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { getStudyFlowState } from "@/lib/services/study-flow-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StudyFlowGuideProps = {
  compact?: boolean;
  className?: string;
};

export function StudyFlowGuide({ compact = false, className }: StudyFlowGuideProps) {
  const { dataset, progress } = useApp();
  const flow = dataset ? getStudyFlowState(dataset, progress) : null;

  if (!flow) return null;

  const current = flow.steps.find((s) => s.isCurrent) ?? flow.steps[0];
  const progressPct =
    current && current.total > 0
      ? Math.round((current.done / current.total) * 100)
      : 0;

  const mainSteps = flow.steps.filter(
    (s) => s.step === "confirm_meanings" || s.step === "shadow" || s.step === "active_recall"
  );

  return (
    <Card className={cn("p-4", compact ? "mb-4" : "mb-6", className)}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {mainSteps.map((step, i) => (
          <div key={step.step} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted" />}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                step.isCurrent
                  ? "bg-foreground text-background"
                  : step.isComplete
                    ? "bg-foreground/10 text-foreground"
                    : "bg-surface text-muted"
              )}
            >
              {step.isComplete ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="tabular-nums">{i + 1}</span>
              )}
              <span>{step.title}</span>
            </div>
          </div>
        ))}
      </div>

      {current && (
        <>
          <p className="text-sm leading-relaxed text-muted">{current.instruction}</p>
          {current.total > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs tabular-nums text-muted">
                {current.step === "confirm_meanings"
                  ? `${current.done} / ${current.total} meanings confirmed`
                  : current.step === "active_recall" && current.total > 1
                    ? `${current.total} sentences due`
                    : current.step === "shadow"
                      ? `${current.total} sentences ready`
                      : `${current.done} / ${current.total}`}
              </p>
            </div>
          )}
        </>
      )}

      <Button className={cn("mt-4", compact ? "w-full" : "w-full sm:w-auto")} asChild>
        <Link href={flow.nextHref}>
          {flow.nextLabel}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}
