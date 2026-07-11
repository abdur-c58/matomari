"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LibrarySentenceRow } from "./library-sentence-row";
import {
  ActiveFilterBadges,
  FilterDrawer,
  LibraryQuickFilters,
  LibrarySearch,
} from "./filter-sheet";
import {
  buildLibraryMeta,
  countActiveFilters,
  defaultLibraryFilters,
  describeActiveFilters,
  filterLibrarySentences,
  getLibrarySentences,
  groupLibrarySentences,
  type LibraryFilters,
} from "@/lib/services/library-service";
import { getActiveBatchIds } from "@/lib/services/batch-service";
import { suggestRating, applyRating } from "@/lib/services/rating-service";
import { retireSentence, shouldRetire } from "@/lib/services/batch-service";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { listItem, smoothTransition, staggerContainer } from "@/lib/motion";
import { TranslateAllButton } from "./translate-all-button";

export function LibraryView() {
  const { dataset, progress, updateProgress, setProgress } = useApp();
  const [filters, setFilters] = useState<LibraryFilters>(defaultLibraryFilters);

  const allSentences = useMemo(
    () => (dataset ? getLibrarySentences(dataset) : []),
    [dataset]
  );

  const meta = useMemo(
    () => (dataset ? buildLibraryMeta(dataset) : null),
    [dataset]
  );

  const filtered = useMemo(
    () => filterLibrarySentences(allSentences, progress, filters),
    [allSentences, progress, filters]
  );

  const groups = useMemo(() => {
    if (!dataset) return [{ key: "all", label: "All", sentences: filtered }];
    return groupLibrarySentences(filtered, progress, filters.groupBy, dataset);
  }, [filtered, progress, filters.groupBy, dataset]);

  const activeIds = useMemo(() => new Set(getActiveBatchIds(progress)), [progress]);

  const activeFilterCount = countActiveFilters(filters);
  const activeLabels = meta ? describeActiveFilters(filters, meta) : [];

  const defaultProgress = (sentenceId: string) => ({
    sentenceId,
    rating: null,
    recallHistory: [],
    meaningConfirmed: false,
    batchStatus: "unseen" as const,
    srsNextReview: null,
    srsIntervalIndex: 0,
    retiredAt: null,
    firstSeenAt: null,
    masteredAt: null,
    sourceType: "pathway" as const,
    sourceKey: "",
  });

  const handleRate = async (sentenceId: string, rating: number) => {
    if (!dataset) return;
    const sp = progress.sentences[sentenceId];
    const updated = applyRating(sp ?? defaultProgress(sentenceId), rating);
    await updateProgress(sentenceId, updated);
    if (shouldRetire(rating)) {
      await setProgress(retireSentence(dataset, progress, sentenceId));
    }
    toast.success(`Rated ${rating} stars`);
  };

  return (
    <AppGate>
      <PageShell>
        <PageHeader
          title="Library"
          subtitle={`${filtered.length} of ${allSentences.length} sentences`}
          action={<TranslateAllButton />}
        />

        <div className="sticky top-0 z-10 -mx-4 mb-3 bg-background/90 px-4 py-2 backdrop-blur-xl">
          <div className="flex gap-2">
            <LibrarySearch
              value={filters.search}
              onChange={(search) => setFilters({ ...filters, search })}
            />
            {meta && (
              <FilterDrawer
                filters={filters}
                onChange={setFilters}
                meta={meta}
                activeFilterCount={activeFilterCount}
              />
            )}
          </div>
          <LibraryQuickFilters filters={filters} onChange={setFilters} />
          <ActiveFilterBadges
            labels={activeLabels}
            onClear={() => setFilters({ ...defaultLibraryFilters, search: filters.search })}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try adjusting your search or filters."
          />
        ) : (
          <motion.div
            className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`${filters.groupBy}-${filtered.length}-${filters.search}`}
          >
            <AnimatePresence mode="popLayout">
              {groups.map((group) => (
                <motion.section
                  key={group.key}
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={smoothTransition}
                >
                  {filters.groupBy !== "none" && (
                    <div className="mb-1 flex items-baseline justify-between px-1">
                      <h2 className="font-display text-sm font-semibold text-foreground">
                        {group.label}
                      </h2>
                      <span className="text-xs tabular-nums text-muted">
                        {group.sentences.length}
                      </span>
                    </div>
                  )}
                  <Card className="overflow-hidden px-2 py-0">
                    {group.sentences.map((s) => {
                      const sp = progress.sentences[s.id] ?? defaultProgress(s.id);
                      return (
                        <LibrarySentenceRow
                          key={s.id}
                          sentence={s}
                          progress={progress.sentences[s.id]}
                          isActive={activeIds.has(s.id)}
                          suggestedRating={suggestRating(sp)}
                          onRate={(r) => handleRate(s.id, r)}
                        />
                      );
                    })}
                  </Card>
                </motion.section>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </PageShell>
    </AppGate>
  );
}
