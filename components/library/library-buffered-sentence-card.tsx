"use client";

import { useMemo } from "react";
import type { LibrarySentence } from "@/lib/services/library-service";
import type { SentenceProgress, UserProgress } from "@/types/progress";
import { LibrarySentenceRow } from "@/components/library/library-sentence-row";
import { BufferedListSentinel } from "@/components/ui/buffered-list";
import { Card } from "@/components/ui/card";
import { useBufferedVisibleCount } from "@/hooks/use-buffered-visible-count";
import { suggestRating } from "@/lib/services/rating-service";

const LIBRARY_INITIAL = 56;
const LIBRARY_STEP = 56;
const LIBRARY_MARGIN_PX = 1400;

function emptyProgress(sentenceId: string): SentenceProgress {
  return {
    sentenceId,
    rating: null,
    recallHistory: [],
    meaningConfirmed: false,
    batchStatus: "unseen",
    srsNextReview: null,
    srsIntervalIndex: 0,
    retiredAt: null,
    firstSeenAt: null,
    masteredAt: null,
    sourceType: "island",
    sourceKey: "",
  };
}

export function LibraryBufferedSentenceCard({
  sentences,
  resetKey,
  progress,
  activeIds,
  selectionMode,
  canSelect,
  selectedIds,
  onToggleSelect,
  onRate,
}: {
  sentences: LibrarySentence[];
  resetKey: string;
  progress: UserProgress;
  activeIds: Set<string>;
  selectionMode: boolean;
  canSelect: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}) {
  const { visibleCount, hasMore, sentinelRef } = useBufferedVisibleCount(
    sentences.length,
    {
      initial: LIBRARY_INITIAL,
      step: LIBRARY_STEP,
      rootMarginPx: LIBRARY_MARGIN_PX,
      resetKey,
    }
  );

  const visible = useMemo(
    () => sentences.slice(0, visibleCount),
    [sentences, visibleCount]
  );

  return (
    <Card className="overflow-hidden px-2 py-0">
      {visible.map((s) => {
        const sp = progress.sentences[s.id] ?? emptyProgress(s.id);
        const isSelectable = s.sourceType === "island";
        return (
          <LibrarySentenceRow
            key={s.id}
            sentence={s}
            progress={progress.sentences[s.id]}
            isActive={activeIds.has(s.id)}
            suggestedRating={suggestRating(sp)}
            onRate={(r) => onRate(s.id, r)}
            selectionMode={selectionMode && canSelect}
            selectable={isSelectable}
            selected={selectedIds.has(s.id)}
            onToggleSelect={() => onToggleSelect(s.id)}
          />
        );
      })}
      <BufferedListSentinel
        hasMore={hasMore}
        sentinelRef={sentinelRef}
        remaining={sentences.length - visibleCount}
      />
    </Card>
  );
}
