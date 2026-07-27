"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { StudyFlowGuide } from "@/components/study/study-flow-guide";
import { BrowseSentenceList } from "@/components/study/browse-sentence-list";
import { ScenePlayerToolbar } from "@/components/study/scene-player-toolbar";
import { PathwayBatchPills } from "@/components/study/pathway-batch-pills";
import { AddSentenceDialog } from "@/components/study/custom-sentence-composer";
import type { Sentence } from "@/types/sentence";
import { useFormalStudyStart } from "@/hooks/use-formal-study-start";
import { SceneSwitchDialog } from "@/components/study/scene-switch-dialog";
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
import { SceneOfflineControls } from "@/components/offline/offline-audio-controls";
import { SceneExportButton } from "@/components/study/scene-export-button";
import { PATHWAY_THEME_KANJI } from "@/lib/services/study-unit-kanji-service";
import type { Dialect } from "@/lib/constants/dialect";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { cn } from "@/lib/utils";
import { CreatedByLabel } from "@/components/scenes/created-by-label";
import { SceneShareControls } from "@/components/scenes/scene-share-controls";
import { SceneCloneButton } from "@/components/scenes/scene-clone-button";
import { Badge } from "@/components/ui/badge";
import { useSceneAccess } from "@/hooks/use-scene-access";

export function StudyUnitDetailShell({
  title,
  description,
  isPathway = false,
  sceneKey,
  pathwayBatchNumber: initialBatch,
  showCustomSentence = false,
  themeKanji,
  backHref = "/batch",
  backLabel = "All scenes",
}: {
  title: string;
  description: string;
  isPathway?: boolean;
  sceneKey?: string;
  pathwayBatchNumber?: number;
  showCustomSentence?: boolean;
  themeKanji?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { dataset, progress, setProgress, updateScene, isPremadeSceneKey } = useApp();
  const { checkAccess, lockMessage, loaded: accessLoaded } = useSceneAccess();
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
      sceneBrowseDisplay: progress.settings.sceneBrowseDisplay,
      casualPlaylistPauseMs: progress.settings.casualPlaylistPauseMs,
      casualPlaylistPlaybackRate: progress.settings.casualPlaylistPlaybackRate,
    }),
    [
      progress.settings.sceneBrowseDisplay,
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
    : ({ kind: "scene", key: sceneKey! } as const);

  const touchKey = isPathway ? "pathway" : `scene:${sceneKey}`;
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
          sceneKey: null,
          subtopic: null,
        },
        unitRef
      );
    } else if (sceneKey) {
      await startFormalStudy(
        {
          sourceType: "scene",
          pathwayBatchNumber: null,
          sceneKey,
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
        speakerVoices:
          sceneKey && dataset?.scenes?.[sceneKey]?.speakerVoices
            ? dataset.scenes[sceneKey].speakerVoices
            : null,
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
      sceneKey,
      dataset,
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
      : sceneKey
        ? dataset?.scenes[sceneKey]?.themeKanji ?? "島"
        : "島");

  const scene = !isPathway && sceneKey ? dataset?.scenes[sceneKey] : undefined;
  const isNarration = scene?.format === "narration";
  const narratorLabels = (scene?.speakers ?? ["A", "B"]).join(" / ");
  const isShared = Boolean(scene?.readOnly || scene?.provenance?.kind === "shared");
  const canEdit = Boolean(sceneKey && scene && !isShared && !isPremadeSceneKey(sceneKey));
  const shareIdForClone = scene?.provenance?.shareId;

  if (!dataset) return null;

  const sceneAccess =
    !isPathway && sceneKey
      ? checkAccess(sceneKey)
      : { accessible: true, reason: "ok" as const };
  const locked = accessLoaded && !sceneAccess.accessible;

  if (locked) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface/80 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-muted">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted">
              {lockMessage(sceneAccess.reason)}
            </p>
          </div>
          <Link
            href="/billing/checkout"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--mode-listen)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Upgrade to access
          </Link>
        </div>
      </div>
    );
  }

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
          isPathway ? "pathway" : isNarration ? "narration" : "scene"
        }
        className={cn(
          isPathway && "border-orange-300/40",
          isNarration && "narration-scene-card border-violet-300/60"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
          {isNarration && (
            <span className="inline-flex items-center rounded-md border border-violet-300/35 bg-violet-950/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100">
              Narration
            </span>
          )}
          {isShared && <Badge variant="secondary">Shared · read-only</Badge>}
        </div>
        {!isPathway && description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
        <CreatedByLabel createdBy={scene?.createdBy} className="mt-1 text-xs text-muted" />
        {isNarration && scene?.narrationMode && (
          <p className="mt-1 text-xs text-muted">
            Narration tone: {scene.narrationMode.context}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          {sentences.length} sentences
          {isNarration ? ` · 2 speakers · ${narratorLabels}` : ""}
        </p>
        {sceneKey && scene && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit && (
              <SceneShareControls
                sceneKey={sceneKey}
                scene={scene}
                onSceneUpdated={(next) => {
                  void updateScene(sceneKey, next);
                }}
              />
            )}
            {isShared && shareIdForClone && <SceneCloneButton shareId={shareIdForClone} />}
          </div>
        )}
        {sceneKey && (
          <div className="mt-3 space-y-3">
            <SceneOfflineControls
              sceneKey={sceneKey}
              label={title}
              sentenceIds={sentences.map((s) => s.id)}
              dialect={getPrimaryTranslation(progress.settings)}
            />
            <SceneExportButton
              sceneKey={sceneKey}
              dialect={getPrimaryTranslation(progress.settings)}
            />
          </div>
        )}
      </DecoratedStudySurface>

      {!isNarration && (
        <StudyFlowGuide
          compact
          onStartFormalStudy={handleFormalStudy}
          startLabel="Start study session"
        />
      )}

      {isPathway && pathwayStats.length > 0 && (
        <PathwayBatchPills
          batches={pathwayStats}
          selectedBatch={pathwayBatch}
          onSelect={setPathwayBatch}
        />
      )}

      <StickyPlayerBar>
        <ScenePlayerToolbar
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          showCustomSentence={showCustomSentence && canEdit}
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
          contextualTiming={isNarration}
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

      {showCustomSentence && canEdit && sceneKey && (
        <AddSentenceDialog
          sceneKey={sceneKey}
          sceneTitle={title}
          open={addSentenceOpen}
          onOpenChange={setAddSentenceOpen}
        />
      )}

      <SceneSwitchDialog
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
