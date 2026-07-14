"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { StudyFlowGuide } from "@/components/study/study-flow-guide";
import { BrowseSentenceList } from "@/components/study/browse-sentence-list";
import { IslandPlayerToolbar } from "@/components/study/island-player-toolbar";
import { PathwayBatchPills } from "@/components/study/pathway-batch-pills";
import { AddSentenceDialog } from "@/components/study/custom-sentence-composer";
import type { Sentence } from "@/types/sentence";
import { useFormalStudyStart } from "@/hooks/use-formal-study-start";
import { IslandSwitchDialog } from "@/components/study/island-switch-dialog";
import {
  useCasualPlaylist,
} from "@/hooks/use-casual-playlist";
import { useBrowseUiPreferences } from "@/hooks/use-browse-ui-preferences";
import { useSentenceSelection } from "@/hooks/use-sentence-selection";
import {
  getPathwayBatchStats,
  getSuggestedPathwayBatch,
} from "@/lib/services/study-focus-service";
import { getSentencesForStudyUnit, touchStudyUnit } from "@/lib/services/study-unit-service";
import { DecoratedStudySurface } from "@/components/study/decorated-study-surface";
import { StickyPlayerBar } from "@/components/study/sticky-player-bar";
import { PlaylistDialectDialog } from "@/components/study/playlist-dialect-dialog";
import { PATHWAY_THEME_KANJI } from "@/lib/services/study-unit-kanji-service";
import type { Dialect } from "@/lib/constants/dialect";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { cn } from "@/lib/utils";

export function StudyUnitDetailShell({
  title,
  description,
  isPathway = false,
  islandKey,
  pathwayBatchNumber: initialBatch,
  showCustomSentence = false,
  themeKanji,
  backHref = "/batch",
  backLabel = "All islands",
}: {
  title: string;
  description: string;
  isPathway?: boolean;
  islandKey?: string;
  pathwayBatchNumber?: number;
  showCustomSentence?: boolean;
  themeKanji?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { dataset, progress, setProgress } = useApp();
  const { startFormalStudy, switchPrompt, confirmSwitch, cancelSwitch } =
    useFormalStudyStart();
  const {
    playPlaylist,
    playlistActive,
    isPaused,
    stopPlaylist,
    pausePlaylist,
    resumePlaylist,
  } = useCasualPlaylist();

  const progressBrowseDefaults = useMemo(
    () => ({
      islandBrowseDisplay: progress.settings.islandBrowseDisplay,
      casualPlaylistPauseMs: progress.settings.casualPlaylistPauseMs,
      casualPlaylistPlaybackRate: progress.settings.casualPlaylistPlaybackRate,
    }),
    [
      progress.settings.islandBrowseDisplay,
      progress.settings.casualPlaylistPauseMs,
      progress.settings.casualPlaylistPlaybackRate,
    ]
  );

  const {
    displayMode,
    pauseMs,
    playbackRate,
    setDisplayMode,
    updatePlaybackSettings,
  } = useBrowseUiPreferences(progressBrowseDefaults);

  const [selectionMode, setSelectionMode] = useState(false);
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const [dialectDialogOpen, setDialectDialogOpen] = useState(false);
  const [dialectDialogSentenceCount, setDialectDialogSentenceCount] = useState(0);
  const [addSentenceOpen, setAddSentenceOpen] = useState(false);
  const pendingPlaySentencesRef = useRef<Sentence[] | null>(null);

  const showKansaiDialect = progress.settings.showKansaiDialect ?? false;

  const suggestedBatch = useMemo(
    () => (dataset ? getSuggestedPathwayBatch(dataset, progress) : 1),
    [dataset, progress]
  );

  const [pathwayBatch, setPathwayBatch] = useState(
    initialBatch ?? suggestedBatch
  );

  const unitRef = isPathway
    ? ({ kind: "pathway" } as const)
    : ({ kind: "island", key: islandKey! } as const);

  const touchKey = isPathway ? "pathway" : `island:${islandKey}`;
  const touchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dataset || touchedRef.current === touchKey) return;
    touchedRef.current = touchKey;
    void setProgress((current) => touchStudyUnit(current, unitRef));
  }, [dataset, setProgress, touchKey, unitRef]);

  const pathwayStats = useMemo(
    () => (dataset ? getPathwayBatchStats(dataset, progress) : []),
    [dataset, progress]
  );

  const sentences = useMemo(() => {
    if (!dataset) return [];
    return getSentencesForStudyUnit(
      dataset,
      unitRef,
      isPathway ? pathwayBatch : null
    );
  }, [dataset, isPathway, pathwayBatch, unitRef]);

  const {
    selectedSentences,
    isSelected,
    toggle,
    enterSelectionAt,
    clear,
    selectionCount,
  } = useSentenceSelection(sentences);

  const handleFormalStudy = async () => {
    if (isPathway) {
      await startFormalStudy(
        {
          sourceType: "pathway",
          pathwayBatchNumber: pathwayBatch,
          islandKey: null,
          subtopic: null,
        },
        unitRef
      );
    } else if (islandKey) {
      await startFormalStudy(
        {
          sourceType: "island",
          pathwayBatchNumber: null,
          islandKey,
          subtopic: null,
        },
        unitRef
      );
    }
  };

  const handlePlaySelected = useCallback(
    async (dialect?: Dialect) => {
      const toPlay =
        selectionMode && selectionCount > 0 ? selectedSentences : sentences;
      await playPlaylist(toPlay, unitRef, {
        pauseMs,
        playbackRate,
        albumTitle: title,
        dialect: dialect ?? getPrimaryTranslation(progress.settings),
        onIndexChange: (sentenceId) => {
          setPlayingSentenceId(sentenceId || null);
        },
      });
    },
    [
      selectionMode,
      selectionCount,
      selectedSentences,
      sentences,
      playPlaylist,
      unitRef,
      pauseMs,
      playbackRate,
      progress.settings,
      title,
    ]
  );

  const handleStopPlaylist = useCallback(() => {
    stopPlaylist();
    setPlayingSentenceId(null);
  }, [stopPlaylist]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) resumePlaylist();
    else pausePlaylist();
  }, [isPaused, pausePlaylist, resumePlaylist]);

  const requestPlaylistPlayback = useCallback(() => {
    const toPlay =
      selectionMode && selectionCount > 0 ? selectedSentences : sentences;

    if (showKansaiDialect) {
      pendingPlaySentencesRef.current = toPlay;
      setDialectDialogSentenceCount(toPlay.length);
      setDialectDialogOpen(true);
      return;
    }

    void handlePlaySelected();
  }, [
    handlePlaySelected,
    selectionCount,
    selectionMode,
    selectedSentences,
    sentences,
    showKansaiDialect,
  ]);

  const handleDialectChoice = useCallback(
    (dialect: Dialect) => {
      setDialectDialogOpen(false);
      const toPlay = pendingPlaySentencesRef.current;
      pendingPlaySentencesRef.current = null;
      if (!toPlay) return;
      void handlePlaySelected(dialect);
    },
    [handlePlaySelected]
  );

  const headerKanji =
    themeKanji ??
    (isPathway
      ? PATHWAY_THEME_KANJI
      : islandKey
        ? dataset?.islands[islandKey]?.themeKanji ?? "島"
        : "島");

  const island = !isPathway && islandKey ? dataset?.islands[islandKey] : undefined;
  const isNarration = island?.format === "narration";
  const narratorLabels = (island?.speakers ?? ["A", "B"]).join(" / ");

  if (!dataset) return null;

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <DecoratedStudySurface
        kanji={headerKanji}
        variant={
          isPathway ? "pathway" : isNarration ? "narration" : "island"
        }
        className={cn(
          isPathway && "border-orange-300/40",
          isNarration && "narration-island-card border-violet-300/60"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
          {isNarration && (
            <span className="inline-flex items-center rounded-md border border-violet-300/35 bg-violet-950/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100">
              Narration
            </span>
          )}
        </div>
        {!isPathway && description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          {sentences.length} sentences
          {isNarration ? ` · 2 speakers · ${narratorLabels}` : ""}
        </p>
      </DecoratedStudySurface>

      <StudyFlowGuide
        compact
        onStartFormalStudy={handleFormalStudy}
        startLabel="Start study session"
      />

      {isPathway && pathwayStats.length > 0 && (
        <PathwayBatchPills
          batches={pathwayStats}
          selectedBatch={pathwayBatch}
          onSelect={setPathwayBatch}
        />
      )}

      <StickyPlayerBar>
        <IslandPlayerToolbar
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          showCustomSentence={showCustomSentence && Boolean(islandKey)}
          onAddSentence={() => setAddSentenceOpen(true)}
          selectionMode={selectionMode}
          selectionCount={selectionCount}
          onToggleSelectionMode={() => {
            setSelectionMode((v) => !v);
            if (selectionMode) clear();
          }}
          onClearSelection={clear}
          playlistActive={playlistActive}
          isPaused={isPaused}
          onPauseResume={handlePauseResume}
          onStopPlaylist={handleStopPlaylist}
          onRequestPlaylistPlayback={requestPlaylistPlayback}
          pauseMs={pauseMs}
          playbackRate={playbackRate}
          onPauseMsChange={(ms) =>
            void updatePlaybackSettings({ casualPlaylistPauseMs: ms })
          }
          onPlaybackRateChange={(rate) =>
            void updatePlaybackSettings({ casualPlaylistPlaybackRate: rate })
          }
        />
      </StickyPlayerBar>

      <BrowseSentenceList
        sentences={sentences}
        displayMode={displayMode}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={toggle}
        onEnterSelectionAt={enterSelectionAt}
        onRequestSelectionMode={() => setSelectionMode(true)}
        onClearSelection={clear}
        selectionCount={selectionCount}
        playingSentenceId={playingSentenceId}
        narration={isNarration}
      />

      {showCustomSentence && islandKey && (
        <AddSentenceDialog
          islandKey={islandKey}
          islandTitle={title}
          open={addSentenceOpen}
          onOpenChange={setAddSentenceOpen}
        />
      )}

      <IslandSwitchDialog
        open={switchPrompt != null}
        fromLabel={switchPrompt?.fromLabel ?? ""}
        toLabel={switchPrompt?.toLabel ?? ""}
        onConfirm={() => void confirmSwitch()}
        onCancel={cancelSwitch}
      />

      <PlaylistDialectDialog
        open={dialectDialogOpen}
        sentenceCount={
          dialectDialogSentenceCount > 0
            ? dialectDialogSentenceCount
            : selectionMode && selectionCount > 0
              ? selectionCount
              : sentences.length
        }
        onOpenChange={(open) => {
          setDialectDialogOpen(open);
          if (!open) {
            pendingPlaySentencesRef.current = null;
            setDialectDialogSentenceCount(0);
          }
        }}
        onSelect={handleDialectChoice}
      />
    </div>
  );
}
