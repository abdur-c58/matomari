"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LibraryBufferedSentenceCard } from "@/components/library/library-buffered-sentence-card";
import {
  ActiveFilterBadges,
  FilterDrawer,
  LibraryQuickFilters,
  LibrarySearch,
} from "@/components/library/filter-sheet";
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
import { bulkApplySentenceRatings } from "@/lib/services/bulk-rating-service";
import { BulkRateDialog } from "@/components/library/bulk-rate-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listItem, smoothTransition, staggerContainer } from "@/lib/motion";
import { TranslateAllButton, TranslateKansaiAllButton } from "@/components/library/translate-all-button";
import { cn } from "@/lib/utils";

function formatLabel(key: string): string {
  return key.replace(/_/g, " ");
}

export function LibraryViewMobile() {
  const { dataset, progress, setProgress } = useApp();
  const [filters, setFilters] = useState<LibraryFilters>(defaultLibraryFilters);
  const deferredFilters = useDeferredValue(filters);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDialogIds, setBulkDialogIds] = useState<string[]>([]);
  const [bulkDialogLabel, setBulkDialogLabel] = useState<string | undefined>();
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSentences = useMemo(
    () => (dataset ? getLibrarySentences(dataset) : []),
    [dataset]
  );

  const meta = useMemo(
    () => (dataset ? buildLibraryMeta(dataset) : null),
    [dataset]
  );

  const filtered = useMemo(
    () => filterLibrarySentences(allSentences, progress, deferredFilters),
    [allSentences, progress, deferredFilters]
  );

  const groups = useMemo(() => {
    if (!dataset) return [{ key: "all", label: "All", sentences: filtered }];
    return groupLibrarySentences(
      filtered,
      progress,
      deferredFilters.groupBy,
      dataset
    );
  }, [filtered, progress, deferredFilters.groupBy, dataset]);

  const activeIds = useMemo(() => new Set(getActiveBatchIds(progress)), [progress]);
  const activeFilterCount = countActiveFilters(filters);
  const activeLabels = meta ? describeActiveFilters(filters, meta) : [];
  const filtersPending = deferredFilters !== filters;

  const canSelect =
    deferredFilters.sourceType === "island" ||
    deferredFilters.islandKey !== null ||
    deferredFilters.groupBy === "island";

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openBulkDialog = useCallback((ids: string[], label?: string) => {
    if (ids.length === 0) {
      toast.error("No sentences to rate");
      return;
    }
    setBulkDialogIds(ids);
    setBulkDialogLabel(label);
    setBulkDialogOpen(true);
  }, []);

  const applyBulkRating = useCallback(
    async (rating: number) => {
      if (!dataset || bulkDialogIds.length === 0) return;
      setBulkLoading(true);
      try {
        const result = bulkApplySentenceRatings(dataset, progress, bulkDialogIds, rating);
        await setProgress(result.progress);
        toast.success(
          `Rated ${result.updatedCount} sentence${result.updatedCount === 1 ? "" : "s"}`
        );
        exitSelectionMode();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not apply rating");
      } finally {
        setBulkLoading(false);
      }
    },
    [dataset, progress, bulkDialogIds, setProgress, exitSelectionMode]
  );

  const handleRate = useCallback(
    async (sentenceId: string, rating: number) => {
      if (!dataset) return;
      const result = bulkApplySentenceRatings(dataset, progress, [sentenceId], rating);
      await setProgress(result.progress);
      toast.success(`Rated ${rating} stars`);
    },
    [dataset, progress, setProgress]
  );

  const handleRateEntireFilteredIsland = useCallback(() => {
    if (!dataset || !filters.islandKey) return;
    const island = dataset.islands[filters.islandKey];
    if (!island) return;
    openBulkDialog(
      island.sentences.map((s) => s.id),
      formatLabel(filters.islandKey)
    );
  }, [dataset, filters.islandKey, openBulkDialog]);

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultLibraryFilters, search: filters.search });
  }, [filters.search]);

  return (
    <AppGate>
      <PageShell className={cn(selectionMode && selectedIds.size > 0 && "pb-24")}>
        <PageHeader
          title="Library"
          subtitle={`${filtered.length} of ${allSentences.length} sentences`}
          action={
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
              {canSelect && (
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectionMode) exitSelectionMode();
                    else setSelectionMode(true);
                  }}
                >
                  {selectionMode ? "Done" : "Select"}
                </Button>
              )}
              {filters.islandKey && !selectionMode && (
                <Button variant="outline" size="sm" onClick={handleRateEntireFilteredIsland}>
                  Rate island
                </Button>
              )}
              {!selectionMode && (
                <>
                  <TranslateAllButton />
                  <TranslateKansaiAllButton />
                </>
              )}
            </div>
          }
        />

        <div className="sticky top-0 z-10 -mx-4 mb-4 space-y-2 bg-background/90 px-4 py-2 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            {meta && (
              <FilterDrawer
                filters={filters}
                onChange={setFilters}
                meta={meta}
                activeFilterCount={activeFilterCount}
              />
            )}
            <LibrarySearch
              value={filters.search}
              onChange={(search) => setFilters({ ...filters, search })}
            />
            <LibraryQuickFilters filters={filters} onChange={setFilters} />
          </div>
          <ActiveFilterBadges
            labels={activeLabels}
            onClear={clearFilters}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description={
              filtersPending ? "Updating results…" : "Try adjusting your search or filters."
            }
          />
        ) : (
          <motion.div
            className={cn("space-y-4", filtersPending && "opacity-70")}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`${deferredFilters.groupBy}-${filtered.length}-${deferredFilters.search}`}
          >
            <AnimatePresence mode="popLayout">
              {groups.map((group) => {
                const isIslandGroup =
                  deferredFilters.groupBy === "island" &&
                  group.key !== "main-pathway";
                const groupIslandIds = group.sentences
                  .filter((s) => s.sourceType === "island")
                  .map((s) => s.id);

                return (
                  <motion.section
                    key={group.key}
                    layout
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={smoothTransition}
                  >
                    {deferredFilters.groupBy !== "none" && (
                      <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
                        <h2 className="font-display text-sm font-semibold text-foreground">
                          {group.label}
                        </h2>
                        <div className="flex items-center gap-2">
                          {isIslandGroup && groupIslandIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                openBulkDialog(groupIslandIds, formatLabel(group.key))
                              }
                            >
                              Rate all
                            </Button>
                          )}
                          <span className="text-xs tabular-nums text-muted">
                            {group.sentences.length}
                          </span>
                        </div>
                      </div>
                    )}
                    <LibraryBufferedSentenceCard
                      sentences={group.sentences}
                      resetKey={`${deferredFilters.groupBy}:${group.key}:${deferredFilters.search}:${filtered.length}`}
                      progress={progress}
                      activeIds={activeIds}
                      selectionMode={selectionMode}
                      canSelect={canSelect}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onRate={(id, rating) => void handleRate(id, rating)}
                    />
                  </motion.section>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {selectionMode && selectedIds.size > 0 && (
          <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4">
            <Card className="flex items-center gap-2 border-foreground/20 p-3 shadow-lg">
              <span className="flex-1 text-sm font-medium tabular-nums">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => openBulkDialog([...selectedIds])}
              >
                Rate
              </Button>
            </Card>
          </div>
        )}

        <BulkRateDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          sentenceCount={bulkDialogIds.length}
          label={bulkDialogLabel}
          loading={bulkLoading}
          onConfirm={applyBulkRating}
        />
      </PageShell>
    </AppGate>
  );
}
