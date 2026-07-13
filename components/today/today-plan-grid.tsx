"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/app-provider";
import {
  buildReturnReviewItem,
  buildTodayPlan,
  getTodayPlanContext,
} from "@/lib/services/today-plan-service";
import { mergeTodayTaskCompletion } from "@/lib/services/daily-progress-service";
import { TodayPlanCard } from "@/components/today/today-plan-card";
import type { TodayPlanItem } from "@/types/today";
import { fadeUp, staggerContainer } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TodayPlanGridProps = {
  className?: string;
  cardClassName?: string;
  layout?: "stack" | "grid";
};

export function TodayPlanGrid({
  className,
  cardClassName,
  layout = "stack",
}: TodayPlanGridProps) {
  const router = useRouter();
  const { dataset, progress, stats, setStats } = useApp();

  const plan = useMemo(
    () => buildTodayPlan(dataset, progress, stats),
    [dataset, progress, stats]
  );

  const returnReview = useMemo(
    () => buildReturnReviewItem(dataset, progress),
    [dataset, progress]
  );

  const ctx = useMemo(
    () => getTodayPlanContext(dataset, progress, stats),
    [dataset, progress, stats]
  );

  const [skipDialog, setSkipDialog] = useState<TodayPlanItem | null>(null);
  const [noReviewOpen, setNoReviewOpen] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  const markMeaningsSkipped = useCallback(async () => {
    await setStats(mergeTodayTaskCompletion(stats, ["meanings"]));
  }, [setStats, stats]);

  const handleActivate = useCallback(
    (item: TodayPlanItem) => {
      if (item.state === "locked") {
        setLockedMessage(
          item.lockedReason ?? "Finish the previous steps first."
        );
        return;
      }

      if (item.type === "review") {
        if ((ctx?.dueReviewCount ?? 0) === 0) {
          setNoReviewOpen(true);
          return;
        }
        router.push(item.href);
        return;
      }

      if (
        item.type === "listen_shadow" &&
        ctx &&
        !ctx.meaningsComplete &&
        ctx.unconfirmedCount > 0
      ) {
        setSkipDialog(item);
        return;
      }

      router.push(item.href);
    },
    [ctx, router]
  );

  const confirmSkipToShadow = useCallback(async () => {
    const target = skipDialog;
    setSkipDialog(null);
    if (!target) return;
    await markMeaningsSkipped();
    router.push(target.href);
  }, [markMeaningsSkipped, router, skipDialog]);

  if (!dataset) {
    return (
      <div className={className}>
        {plan.map((item) => (
          <TodayPlanCard key={item.type} item={item} className={cardClassName} />
        ))}
      </div>
    );
  }

  const containerClass =
    layout === "grid"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
      : "space-y-3";

  return (
    <>
      {returnReview && (
        <div className={cn("mb-3", className)}>
          <TodayPlanCard
            item={returnReview}
            className={cardClassName}
            onActivate={() => router.push(returnReview.href)}
          />
        </div>
      )}

      <motion.div
        className={cn(containerClass, className)}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {plan.map((item) => (
          <motion.div key={item.type} variants={fadeUp} className="h-full">
            <TodayPlanCard
              item={item}
              className={cardClassName}
              onActivate={handleActivate}
            />
          </motion.div>
        ))}
      </motion.div>

      <Dialog
        open={lockedMessage != null}
        onOpenChange={(open) => !open && setLockedMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete the previous step first</DialogTitle>
            <DialogDescription>{lockedMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setLockedMessage(null)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={skipDialog != null} onOpenChange={(open) => !open && setSkipDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip meaning confirmation?</DialogTitle>
            <DialogDescription>
              You haven&apos;t confirmed all meanings yet. You can skip this step
              and continue to shadowing — it will be marked as completed for today.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setSkipDialog(null)}>
              Go back
            </Button>
            <Button onClick={() => void confirmSkipToShadow()}>Skip anyway</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noReviewOpen} onOpenChange={setNoReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No sentences to review</DialogTitle>
            <DialogDescription>
              There are no retired sentences due for review yet. Keep studying
              and they will appear here when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setNoReviewOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
