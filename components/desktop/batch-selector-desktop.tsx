"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import {
  getStudyFocusLabel,
  getStudyFocusProgress,
  getPathwayBatchStats,
  getSuggestedPathwayBatch,
  getIslandSummaries,
} from "@/lib/services/study-focus-service";
import { AppGate } from "@/components/layout/empty-state";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { DesktopPageHeader } from "@/components/layout/desktop-page-header";
import { StudyFocusBanner } from "@/components/batch/study-focus-banner";
import { PathwayBatchList } from "@/components/batch/pathway-batch-list";
import { IslandPicker } from "@/components/batch/island-picker";
import { StudyFlowGuide } from "@/components/study/study-flow-guide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveBatchList } from "@/components/batch/active-batch-list";
import {
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
} from "@/lib/constants/study";
import {
  clampBatchSize,
  getActiveBatchSentences,
} from "@/lib/services/batch-service";
import { toast } from "sonner";
import { Map, Compass, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateIslandDialog } from "@/components/ai/create-island-dialog";
import { CreateManualIslandDialog } from "@/components/islands/create-manual-island-dialog";
import { AskButton } from "@/components/ai/ask-button";
import { BulkRateDialog } from "@/components/library/bulk-rate-dialog";
import { rateIslandSentences } from "@/lib/services/bulk-rating-service";
import {
  getActiveBatchNumber,
  hasActiveBatch,
  useBatchStart,
} from "@/hooks/use-batch-start";

export function BatchSelectorDesktop() {
  const searchParams = useSearchParams();
  const { dataset, progress, setProgress } = useApp();

  const suggestedBatch = useMemo(
    () => (dataset ? getSuggestedPathwayBatch(dataset, progress) : 1),
    [dataset, progress]
  );

  const initialSource =
    searchParams.get("source") === "island"
      ? "island"
      : progress.batchConfig?.sourceType ?? "pathway";

  const parsedBatchParam = searchParams.get("batch");
  const parsedBatchNumber =
    parsedBatchParam !== null ? Number(parsedBatchParam) : null;

  const initialBatch =
    parsedBatchNumber !== null &&
    Number.isFinite(parsedBatchNumber) &&
    parsedBatchNumber > 0
      ? parsedBatchNumber
      : progress.batchConfig?.pathwayBatchNumber ?? suggestedBatch;

  const [batchSize, setBatchSize] = useState(
    clampBatchSize(progress.settings.batchSize)
  );
  const [pathwayBatch, setPathwayBatch] = useState(String(initialBatch));
  const [islandKey, setIslandKey] = useState(
    progress.batchConfig?.islandKey ?? Object.keys(dataset?.islands ?? {})[0] ?? ""
  );
  const [subtopic, setSubtopic] = useState<string>("all");
  const [sourceType, setSourceType] = useState<"pathway" | "island">(initialSource);
  const [islandRateOpen, setIslandRateOpen] = useState(false);
  const [islandRateLoading, setIslandRateLoading] = useState(false);
  const [changeBatchOpen, setChangeBatchOpen] = useState(false);

  const { applyBatch } = useBatchStart(batchSize, pathwayBatch, islandKey, subtopic);

  const pathwayStats = useMemo(
    () => (dataset ? getPathwayBatchStats(dataset, progress) : []),
    [dataset, progress]
  );

  const islandSummaries = useMemo(
    () => (dataset ? getIslandSummaries(dataset, progress) : []),
    [dataset, progress]
  );

  const island = dataset?.islands[islandKey];
  const activeSentences = dataset ? getActiveBatchSentences(dataset, progress) : [];
  const studyFocus = dataset ? getStudyFocusLabel(dataset, progress) : null;
  const focusProgress = dataset
    ? getStudyFocusProgress(dataset, progress)
    : { activeCount: 0, confirmedCount: 0 };
  const batchActive = hasActiveBatch(dataset, progress);
  const activeBatchNumber = getActiveBatchNumber(progress);

  const islandRateCount = useMemo(() => {
    if (!island) return 0;
    if (subtopic === "all") return island.sentences.length;
    return island.sentences.filter((s) => s.subtopic === subtopic).length;
  }, [island, subtopic]);

  const handleRateEntireIsland = async (rating: number) => {
    if (!dataset || !islandKey) return;
    setIslandRateLoading(true);
    try {
      const result = rateIslandSentences(dataset, progress, islandKey, rating, {
        subtopic: subtopic === "all" ? null : subtopic,
      });
      await setProgress(result.progress);
      const label = formatLabel(islandKey);
      toast.success(
        `Rated ${result.updatedCount} sentence${result.updatedCount === 1 ? "" : "s"} in ${label}`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not rate island");
    } finally {
      setIslandRateLoading(false);
    }
  };

  const formatLabel = (s: string) => s.replace(/_/g, " ");

  const batchPicker = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Card className="border-dashed p-3">
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Pathway</span> = core curriculum ·{" "}
            <span className="font-medium text-foreground">Islands</span> = extra topics.{" "}
            <Link href="/guide#pathway-vs-islands" className="underline underline-offset-2">
              Learn more
            </Link>
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSourceType("pathway")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all duration-150",
              sourceType === "pathway"
                ? "border-foreground bg-foreground/5 shadow-sm"
                : "border-border bg-surface hover:border-foreground/30"
            )}
          >
            <Compass className="mb-2 h-5 w-5 text-foreground" />
            <p className="font-semibold">Main pathway</p>
            <p className="text-xs text-muted">Sequential curriculum batches</p>
          </button>
          <button
            type="button"
            onClick={() => setSourceType("island")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all duration-150",
              sourceType === "island"
                ? "border-mode-meaning bg-mode-meaning/5 shadow-sm"
                : "border-border bg-surface hover:border-mode-meaning/30"
            )}
          >
            <Map className="mb-2 h-5 w-5 text-mode-meaning" />
            <p className="font-semibold">Topic islands</p>
            <p className="text-xs text-muted">Optional situational sets</p>
          </button>
        </div>

        <Card className="p-4">
          <Label>Batch size: {batchSize}</Label>
          <Slider
            className="mt-3"
            min={MIN_BATCH_SIZE}
            max={MAX_BATCH_SIZE}
            step={1}
            value={[batchSize]}
            onValueChange={([v]) => setBatchSize(clampBatchSize(v))}
          />
        </Card>
      </div>

      <div className="min-w-0">
        <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "pathway" | "island")}>
          <TabsList className="hidden w-full">
            <TabsTrigger value="pathway">Pathway</TabsTrigger>
            <TabsTrigger value="island">Island</TabsTrigger>
          </TabsList>

          <TabsContent value="pathway" className="space-y-4">
            <PathwayBatchList
              batches={pathwayStats}
              selectedBatch={Number(pathwayBatch)}
              suggestedBatch={suggestedBatch}
              activeBatchNumber={activeBatchNumber}
              skippedBatchNumbers={progress.settings.placement?.skippedBatches ?? []}
              dataset={dataset}
              progress={progress}
              onSelect={(n) => setPathwayBatch(String(n))}
            />
            <Button
              className="w-auto"
              onClick={() =>
                void applyBatch({
                  sourceType: "pathway",
                  pathwayBatchNumber: Number(pathwayBatch),
                  islandKey: null,
                  subtopic: null,
                  batchSize: clampBatchSize(batchSize),
                })
              }
            >
              Start this batch
            </Button>
          </TabsContent>

          <TabsContent value="island" className="space-y-4">
            <div className="mb-4 space-y-0">
              <CreateIslandDialog
                onCreated={(key) => {
                  setIslandKey(key);
                  setSourceType("island");
                }}
              />
              <CreateManualIslandDialog
                onCreated={(key) => {
                  setIslandKey(key);
                  setSourceType("island");
                }}
              />
            </div>

            <IslandPicker
              islands={islandSummaries}
              selectedKey={islandKey}
              onSelect={setIslandKey}
            />

            {island && (
              <>
                <Select value={subtopic} onValueChange={setSubtopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subtopic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subtopics</SelectItem>
                    {island.subtopics.map((st) => (
                      <SelectItem key={st} value={st}>
                        {formatLabel(st)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AskButton
                  context={{ type: "island", islandKey }}
                  label="Ask about this island"
                  variant="outline"
                  className="w-auto"
                />
              </>
            )}

            {islandSummaries.length > 0 && (
              <>
                <Button
                  variant="secondary"
                  className="w-auto"
                  onClick={() => setIslandRateOpen(true)}
                  disabled={!islandKey || islandRateCount === 0}
                >
                  Rate entire island
                </Button>
                <Button
                  className="w-auto"
                  onClick={() =>
                    void applyBatch({
                      sourceType: "island",
                      pathwayBatchNumber: null,
                      islandKey,
                      subtopic: subtopic === "all" ? null : subtopic,
                      batchSize: clampBatchSize(batchSize),
                    })
                  }
                  disabled={!islandKey}
                >
                  Start island batch
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <AppGate>
      <DesktopPageShell>
        <DesktopPageHeader
          title="Study"
          subtitle={
            batchActive
              ? "Continue your current batch or switch focus"
              : "Pick your main pathway batch or an optional topic island"
          }
        />

        {batchActive && (
          <div className="mb-8 space-y-4">
            {studyFocus && (
              <StudyFocusBanner
                focus={studyFocus}
                progress={focusProgress}
                compact
                hideProgress
              />
            )}
            <StudyFlowGuide />
            <Button
              variant="ghost"
              className="justify-between text-muted"
              onClick={() => setChangeBatchOpen((o) => !o)}
            >
              Change batch
              {changeBatchOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {(!batchActive || changeBatchOpen) && batchPicker}

        {batchActive && (
          <div className="mt-8">
            <ActiveBatchList sentences={activeSentences} />
          </div>
        )}

        <BulkRateDialog
          open={islandRateOpen}
          onOpenChange={setIslandRateOpen}
          sentenceCount={islandRateCount}
          label={
            islandKey
              ? `${formatLabel(islandKey)}${subtopic !== "all" ? ` · ${formatLabel(subtopic)}` : ""}`
              : undefined
          }
          loading={islandRateLoading}
          onConfirm={handleRateEntireIsland}
        />
      </DesktopPageShell>
    </AppGate>
  );
}
