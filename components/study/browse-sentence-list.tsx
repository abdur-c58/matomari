"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { BrowseSentenceCard } from "@/components/study/browse-sentence-card";
import { SpeakerChip } from "@/components/study/speaker-chip";
import { bulkApplySentenceRatings } from "@/lib/services/bulk-rating-service";
import { suggestRating } from "@/lib/services/rating-service";
import { groupNarrationTurns } from "@/lib/study/narration-turns";
import type { IslandBrowseDisplay } from "@/lib/constants/island-browse";
import { useLongPress } from "@/hooks/use-long-press";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { useSwipeable } from "react-swipeable";
import { Button } from "@/components/ui/button";
import { BufferedListSentinel } from "@/components/ui/buffered-list";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAppScrollTargets } from "@/lib/utils/scroll-container";
import { audioSession } from "@/lib/audio/audio-session";
import {
  buildPlaylistFromSentences,
} from "@/lib/services/study-playlist-service";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { useBufferedVisibleCount } from "@/hooks/use-buffered-visible-count";
import { MessagesSquare } from "lucide-react";

const AUTO_SCROLL_GUARD_MS = 900;

function bottomFabClass({
  layer,
  playlistActive,
}: {
  layer: "base" | "stacked";
  playlistActive: boolean;
}) {
  if (layer === "base") {
    return playlistActive
      ? "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.25rem))]"
      : "bottom-[max(1.25rem,env(safe-area-inset-bottom))]";
  }

  return playlistActive
    ? "bottom-[max(8.75rem,calc(env(safe-area-inset-bottom)+7.5rem))]"
    : "bottom-[max(4.75rem,env(safe-area-inset-bottom))]";
}

function JumpToCurrentPill({ onClick }: { onClick: () => void }) {
  return (
    <div className="jump-to-current-pill pointer-events-auto">
      <div className="jump-to-current-pill__glow" aria-hidden />
      <button type="button" className="jump-to-current-pill__btn" onClick={onClick}>
        Jump to current
      </button>
    </div>
  );
}

function SelectionModeHint({ isMobile }: { isMobile: boolean }) {
  return (
    <p className="mb-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs leading-relaxed text-muted">
      {isMobile ? (
        <>
          <span className="font-medium text-foreground">Selecting sentences.</span> Press and hold
          to start · Swipe right on a sentence to toggle it · Tap another to select the range
          between
        </>
      ) : (
        <>
          <span className="font-medium text-foreground">Selecting sentences.</span> Click to
          toggle · Shift+click to select a range
        </>
      )}
    </p>
  );
}

function BrowseSentenceRow({
  sentence,
  index,
  selectionMode,
  selected,
  isPlaying,
  isMobile,
  displayMode,
  expansionStep,
  showSpeaker,
  onExpand,
  onCollapse,
  progress,
  onToggleSelect,
  onEnterSelectionAt,
  onRequestSelectionMode,
  onRate,
}: {
  sentence: Sentence;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  isPlaying: boolean;
  isMobile: boolean;
  displayMode: IslandBrowseDisplay;
  expansionStep: number;
  showSpeaker?: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  progress: ReturnType<typeof useApp>["progress"]["sentences"][string] | undefined;
  onToggleSelect?: (sentenceId: string, index: number, shiftKey: boolean) => void;
  onEnterSelectionAt?: (sentenceId: string, index: number) => void;
  onRequestSelectionMode?: () => void;
  onRate: (rating: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleLongPress = useCallback(() => {
    onRequestSelectionMode?.();
    onEnterSelectionAt?.(sentence.id, index);
  }, [index, onEnterSelectionAt, onRequestSelectionMode, sentence.id]);

  const { handlers: longPressHandlers, consumeLongPress } = useLongPress(handleLongPress, {
    disabled: !isMobile || selectionMode,
  });

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (isMobile && selectionMode) {
        onToggleSelect?.(sentence.id, index, false);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 40,
  });

  const speaker = sentence.speaker === "A" || sentence.speaker === "B" ? sentence.speaker : null;

  const row = (
    <motion.div
      ref={rowRef}
      layout
      animate={
        isPlaying
          ? { scale: 1.01 }
          : { scale: 1 }
      }
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "browse-sentence-row rounded-xl",
        isPlaying && "browse-sentence-row--playing",
        selected && selectionMode && "browse-sentence-row--selected",
        selectionMode && isMobile && "select-none"
      )}
      {...(isMobile && !selectionMode ? longPressHandlers : {})}
      onClick={
        isMobile && selectionMode
          ? (e) => {
              if (consumeLongPress()) {
                e.preventDefault();
                return;
              }
              onToggleSelect?.(sentence.id, index, true);
            }
          : undefined
      }
    >
      <div className={cn(showSpeaker && speaker && "flex items-stretch gap-2")}>
        {showSpeaker && speaker && (
          <div className="flex w-6 shrink-0 flex-col items-center pt-3.5">
            <SpeakerChip speaker={speaker} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <BrowseSentenceCard
            sentence={sentence}
            progress={progress}
            displayMode={displayMode}
            expansionStep={expansionStep}
            onExpand={onExpand}
            onCollapse={onCollapse}
            onRate={onRate}
            suggestedRating={progress ? suggestRating(progress) : null}
          />
        </div>
      </div>
    </motion.div>
  );

  if (selectionMode && onToggleSelect) {
    if (isMobile) {
      return <div {...swipeHandlers}>{row}</div>;
    }

    return (
      <button
        type="button"
        className="block w-full text-left"
        onClick={(e) => onToggleSelect(sentence.id, index, e.shiftKey)}
      >
        {row}
      </button>
    );
  }

  return row;
}

export function BrowseSentenceList({
  sentences,
  displayMode,
  selectionMode = false,
  isSelected,
  onToggleSelect,
  onEnterSelectionAt,
  onRequestSelectionMode,
  onClearSelection,
  playingSentenceId = null,
  onManualScroll,
  selectionCount = 0,
  narration = false,
}: {
  sentences: Sentence[];
  displayMode: IslandBrowseDisplay;
  selectionMode?: boolean;
  isSelected?: (sentenceId: string) => boolean;
  onToggleSelect?: (sentenceId: string, index: number, shiftKey: boolean) => void;
  onEnterSelectionAt?: (sentenceId: string, index: number) => void;
  onRequestSelectionMode?: () => void;
  onClearSelection?: () => void;
  playingSentenceId?: string | null;
  onManualScroll?: () => void;
  selectionCount?: number;
  /** Pair A→B turns and show speaker chips. */
  narration?: boolean;
}) {
  const { dataset, progress, setProgress, userLibrary, unlockAudio } = useApp();
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const userScrolledRef = useRef(false);
  const autoScrollingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const [showResync, setShowResync] = useState(false);
  const [playlistActive, setPlaylistActive] = useState(
    () => audioSession.getPlaylistState() !== null
  );

  const narrationTurns = useMemo(
    () => (narration ? groupNarrationTurns(sentences) : null),
    [narration, sentences]
  );

  const listItems = narrationTurns ?? sentences;
  const listResetKey = useMemo(
    () =>
      `${narration ? "n" : "s"}:${sentences.length}:${sentences[0]?.id ?? ""}:${sentences[sentences.length - 1]?.id ?? ""}`,
    [narration, sentences]
  );

  const { visibleCount, hasMore, sentinelRef, ensureVisible } =
    useBufferedVisibleCount(listItems.length, {
      initial: 40,
      step: 40,
      rootMarginPx: 1200,
      resetKey: listResetKey,
    });

  const visibleItems = useMemo(
    () => listItems.slice(0, visibleCount),
    [listItems, visibleCount]
  );

  useEffect(() => {
    const onPlaylist = (state: ReturnType<typeof audioSession.getPlaylistState>) => {
      setPlaylistActive(state !== null);
    };
    audioSession.addPlaylistListener(onPlaylist);
    return () => audioSession.removePlaylistListener(onPlaylist);
  }, []);

  const beginAutoScroll = useCallback(() => {
    autoScrollingRef.current = true;
    window.setTimeout(() => {
      autoScrollingRef.current = false;
    }, AUTO_SCROLL_GUARD_MS);
  }, []);

  const sentencesRef = useRef(sentences);
  const narrationTurnsRef = useRef(narrationTurns);
  const ensureVisibleRef = useRef(ensureVisible);
  const beginAutoScrollRef = useRef(beginAutoScroll);

  sentencesRef.current = sentences;
  narrationTurnsRef.current = narrationTurns;
  ensureVisibleRef.current = ensureVisible;
  beginAutoScrollRef.current = beginAutoScroll;
  const markManualScroll = useCallback(() => {
    if (!playingSentenceId || userScrolledRef.current || autoScrollingRef.current) return;
    userScrolledRef.current = true;
    setShowResync(true);
    onManualScroll?.();
  }, [onManualScroll, playingSentenceId]);

  const [expandedSentenceId, setExpandedSentenceId] = useState<string | null>(null);
  const [expansionStep, setExpansionStep] = useState(0);

  useEffect(() => {
    setExpandedSentenceId(null);
    setExpansionStep(0);
  }, [displayMode]);

  const handleExpand = useCallback(
    (sentenceId: string) => {
      if (expandedSentenceId !== sentenceId) {
        setExpandedSentenceId(sentenceId);
        setExpansionStep(1);
        return;
      }
      setExpansionStep((step) => step + 1);
    },
    [expandedSentenceId]
  );

  const handleCollapse = useCallback((sentenceId: string) => {
    if (expandedSentenceId !== sentenceId) return;
    setExpandedSentenceId(null);
    setExpansionStep(0);
  }, [expandedSentenceId]);

  useEffect(() => {
    if (playingSentenceId !== null) return;
    userScrolledRef.current = false;
    setShowResync(false);
  }, [playingSentenceId]);

  useEffect(() => {
    if (!playingSentenceId || userScrolledRef.current) return;
    const turns = narrationTurnsRef.current;
    if (turns) {
      const turnIdx = turns.findIndex((turn) =>
        turn.kind === "single"
          ? turn.sentence.id === playingSentenceId
          : turn.a.id === playingSentenceId || turn.b.id === playingSentenceId
      );
      if (turnIdx >= 0) ensureVisibleRef.current(turnIdx);
    } else {
      const playIndex = sentencesRef.current.findIndex(
        (s) => s.id === playingSentenceId
      );
      if (playIndex >= 0) ensureVisibleRef.current(playIndex);
    }
    const el =
      [...rowRefs.current.entries()].find(([key]) =>
        key.startsWith(`${playingSentenceId}::`)
      )?.[1] ?? null;
    if (!el) return;
    beginAutoScrollRef.current();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [playingSentenceId, visibleCount, listResetKey]);

  useEffect(() => {
    if (!playingSentenceId) return;

    const onWheel = () => markManualScroll();

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const startY = touchStartYRef.current;
      const y = e.touches[0]?.clientY;
      if (startY == null || y == null) return;
      if (Math.abs(y - startY) > 10) {
        markManualScroll();
      }
    };

    const scrollTargets = getAppScrollTargets();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", markManualScroll, { passive: true });
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", markManualScroll);
      }
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [playingSentenceId, markManualScroll]);

  const handleResync = useCallback(() => {
    if (!playingSentenceId) return;
    userScrolledRef.current = false;
    setShowResync(false);
    const turns = narrationTurnsRef.current;
    if (turns) {
      const turnIdx = turns.findIndex((turn) =>
        turn.kind === "single"
          ? turn.sentence.id === playingSentenceId
          : turn.a.id === playingSentenceId || turn.b.id === playingSentenceId
      );
      if (turnIdx >= 0) ensureVisibleRef.current(turnIdx);
    } else {
      const playIndex = sentencesRef.current.findIndex(
        (s) => s.id === playingSentenceId
      );
      if (playIndex >= 0) ensureVisibleRef.current(playIndex);
    }
    const el =
      [...rowRefs.current.entries()].find(([key]) =>
        key.startsWith(`${playingSentenceId}::`)
      )?.[1] ?? null;
    if (!el) return;
    beginAutoScrollRef.current();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [playingSentenceId]);

  const showJumpPill = showResync && Boolean(playingSentenceId);
  const jumpBottomClass = bottomFabClass({
    layer: isMobile && selectionCount > 0 ? "stacked" : "base",
    playlistActive,
  });
  const unselectBottomClass = bottomFabClass({ layer: "base", playlistActive });
  const listBottomPadding =
    showJumpPill && isMobile && selectionCount > 0
      ? playlistActive
        ? "pb-40"
        : "pb-32"
      : showJumpPill
        ? playlistActive
          ? "pb-32"
          : "pb-24"
        : isMobile && selectionCount > 0
          ? playlistActive
            ? "pb-32"
            : "pb-24"
          : undefined;

  const handleRate = useCallback(
    async (sentenceId: string, rating: number) => {
      if (!dataset) return;
      await setProgress(
        (current) => bulkApplySentenceRatings(dataset, current, [sentenceId], rating).progress
      );
      toast.success(`Rated ${rating} star${rating === 1 ? "" : "s"}`);
    },
    [dataset, progress, setProgress]
  );

  const handlePlayTurn = useCallback(
    async (pair: Sentence[]) => {
      const { playlist, skipped } = buildPlaylistFromSentences(pair, progress, {
        dialect: getPrimaryTranslation(progress.settings),
        translations: userLibrary?.sentenceTranslations,
      });
      if (playlist.length === 0) {
        toast.error(
          skipped > 0
            ? "Translate both lines to play this turn."
            : "Nothing to play."
        );
        return;
      }
      await unlockAudio();
      audioSession.stopPlaylist();
      await audioSession.playPlaylist(playlist, 400);
    },
    [progress, unlockAudio, userLibrary?.sentenceTranslations]
  );

  const renderRow = (
    sentence: Sentence,
    index: number,
    opts?: { showSpeaker?: boolean }
  ) => {
    const sp = progress.sentences[sentence.id];
    const selected = isSelected?.(sentence.id) ?? false;
    const isPlaying = playingSentenceId === sentence.id;
    const rowKey = `${sentence.id}::${index}`;

    return (
      <div
        key={rowKey}
        ref={(el) => {
          if (el) rowRefs.current.set(rowKey, el);
          else rowRefs.current.delete(rowKey);
        }}
      >
        <BrowseSentenceRow
          sentence={sentence}
          index={index}
          selectionMode={selectionMode}
          selected={selected}
          isPlaying={isPlaying}
          isMobile={isMobile}
          displayMode={displayMode}
          expansionStep={expandedSentenceId === sentence.id ? expansionStep : 0}
          showSpeaker={opts?.showSpeaker}
          onExpand={() => handleExpand(sentence.id)}
          onCollapse={() => handleCollapse(sentence.id)}
          progress={sp}
          onToggleSelect={onToggleSelect}
          onEnterSelectionAt={onEnterSelectionAt}
          onRequestSelectionMode={onRequestSelectionMode}
          onRate={(rating) => void handleRate(sentence.id, rating)}
        />
      </div>
    );
  };

  if (sentences.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">No sentences in this island yet.</p>
    );
  }

  return (
    <div
      className={cn(
        "relative",
        listBottomPadding
      )}
    >
      <div ref={listRef} className={cn(narration ? "space-y-3" : "space-y-2")}>
        {selectionMode && <SelectionModeHint isMobile={isMobile} />}
        {narrationTurns
          ? (
              visibleItems as ReturnType<typeof groupNarrationTurns>
            ).map((turn, turnIndex) => {
              if (turn.kind === "single") {
                return renderRow(turn.sentence, turn.index, { showSpeaker: true });
              }

              const pairPlaying =
                playingSentenceId === turn.a.id || playingSentenceId === turn.b.id;

              return (
                <div
                  key={`turn-${turnIndex}-${turn.aIndex}-${turn.bIndex}`}
                  className={cn(
                    "narration-turn rounded-2xl border border-border/45 bg-muted/[0.12] p-1.5",
                    pairPlaying && "narration-turn--active"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 px-1.5 pt-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Turn {turnIndex + 1}
                    </span>
                    {!selectionMode && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-long-press-ignore
                        className="h-7 gap-1.5 px-2 text-xs text-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handlePlayTurn([turn.a, turn.b]);
                        }}
                      >
                        <MessagesSquare className="h-3.5 w-3.5" />
                        Play turn
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {renderRow(turn.a, turn.aIndex, { showSpeaker: true })}
                    <div
                      className="mx-8 border-l border-dashed border-border/55 pl-0"
                      aria-hidden
                    />
                    {renderRow(turn.b, turn.bIndex, { showSpeaker: true })}
                  </div>
                </div>
              );
            })
          : (visibleItems as Sentence[]).map((sentence, index) =>
              renderRow(sentence, index)
            )}
        <BufferedListSentinel
          hasMore={hasMore}
          sentinelRef={sentinelRef}
          remaining={listItems.length - visibleCount}
        />
      </div>

      <AnimatePresence>
        {showJumpPill && (
          <motion.div
            key="jump-to-current-pill"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4",
              jumpBottomClass
            )}
          >
            <JumpToCurrentPill onClick={handleResync} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobile && selectionCount > 0 && (
          <motion.div
            key="unselect-pill"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "pointer-events-none fixed inset-x-0 z-[51] flex justify-center px-4",
              unselectBottomClass
            )}
          >
            <Button
              type="button"
              size="sm"
              data-long-press-ignore
              className="pointer-events-auto h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-lg hover:bg-foreground/90"
              onClick={onClearSelection}
            >
              Unselect all
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
