"use client";

import type { Sentence } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { SentenceCard } from "@/components/sentence/sentence-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";

export function ActiveBatchList({
  sentences,
  progress,
}: {
  sentences: Sentence[];
  progress: UserProgress;
}) {
  if (sentences.length === 0) {
    return (
      <EmptyState
        title="Nothing active yet"
        description="Pick a pathway batch or island above to start studying."
      />
    );
  }

  const confirmed = sentences.filter(
    (s) => progress.sentences[s.id]?.meaningConfirmed
  ).length;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Active sentences</h2>
        <div className="flex gap-2">
          <Badge variant="default">{sentences.length} active</Badge>
          <Badge variant="success">{confirmed} confirmed</Badge>
        </div>
      </div>
      {sentences.map((s) => (
        <SentenceCard
          key={s.id}
          sentence={s}
          progress={progress.sentences[s.id]}
          variant="compact"
        />
      ))}
    </div>
  );
}
