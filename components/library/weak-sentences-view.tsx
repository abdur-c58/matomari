"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SentenceCard } from "@/components/sentence/sentence-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWeakSentenceIds } from "@/lib/services/today-plan-service";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { AlertTriangle } from "lucide-react";

export function WeakSentencesView() {
  const { dataset, progress } = useApp();

  const weakSentences = useMemo(() => {
    if (!dataset) return [];
    const ids = getWeakSentenceIds(progress);
    const all = getAllSentences(dataset);
    return ids.map((id) => all.get(id)).filter((s) => !!s);
  }, [dataset, progress]);

  return (
    <AppGate>
      <PageShell>
        <PageHeader
          title="Weak Sentences"
          subtitle={`${weakSentences.length} rated 1–2 stars`}
          backHref="/"
        />

        {weakSentences.length > 0 && (
          <Card className="mb-6 border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {weakSentences.length} sentences need attention
                </p>
                <p className="text-sm text-muted">
                  ~{Math.ceil(weakSentences.length * 0.5)} min drill
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full" asChild>
              <Link href={`/recall?ids=${weakSentences.map((s) => s!.id).join(",")}`}>
                Drill all weak sentences
              </Link>
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          {weakSentences.map((s) => (
            <SentenceCard
              key={s!.id}
              sentence={s!}
              progress={progress.sentences[s!.id]}
              variant="compact"
            />
          ))}
          {weakSentences.length === 0 && (
            <EmptyState
              title="No weak sentences"
              description="Great work — nothing rated 1–2 stars."
              actionHref="/"
              actionLabel="Back to Today"
            />
          )}
        </div>
      </PageShell>
    </AppGate>
  );
}
