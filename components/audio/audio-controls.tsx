"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Repeat,
  ListMusic,
  ChevronDown,
  ChevronUp,
  SkipBack,
  SkipForward,
  GaugeCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useApp } from "@/components/providers/app-provider";
import { audioSession, type TtsRequest, type PlaylistState } from "@/lib/audio/audio-session";
import { getTtsTextFromFields } from "@/lib/audio/tts-text";
import type { SentencePlaceholder } from "@/types/sentence";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;
const PAUSE_OPTIONS = [
  { label: "0s", ms: 0 },
  { label: "1s", ms: 1000 },
  { label: "2s", ms: 2000 },
  { label: "3s", ms: 3000 },
  { label: "5s", ms: 5000 },
] as const;

interface AudioControlsProps {
  sentenceId?: string;
  japanese?: string;
  reading?: string | null;
  phonetic_reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  placeholders?: SentencePlaceholder[];
  playlist?: TtsRequest[];
  onPlaylistIndex?: (index: number) => void;
  shadowPause?: boolean;
  className?: string;
}

export function AudioControls({
  sentenceId,
  japanese,
  reading,
  phonetic_reading,
  register,
  tags,
  context_notes,
  english,
  placeholders,
  playlist,
  onPlaylistIndex,
  shadowPause = false,
  className,
}: AudioControlsProps) {
  const { audioUnlocked, unlockAudio, audioState, progress } = useApp();
  const learnerJapaneseName = useLearnerJapaneseName();
  const dialect = getPrimaryTranslation(progress.settings);

  const [loop, setLoop] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [pauseMs, setPauseMs] = useState(shadowPause ? 3000 : 1500);
  const [showQueue, setShowQueue] = useState(false);
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(null);
  const queueRef = useRef<HTMLDivElement>(null);

  // Subscribe to playlist state changes from the session
  useEffect(() => {
    audioSession.addPlaylistListener(setPlaylistState);
    return () => audioSession.removePlaylistListener(setPlaylistState);
  }, []);

  // Scroll active queue item into view
  useEffect(() => {
    if (!showQueue || playlistState == null) return;
    const el = queueRef.current?.querySelector(`[data-queue-active="true"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [showQueue, playlistState?.currentIndex]);

  const canPlaySentence = Boolean(
    sentenceId &&
      getTtsTextFromFields(japanese, reading, {
        dialect,
        phonetic_reading,
        placeholders,
        learnerName: learnerJapaneseName,
      })
  );
  const canPlay = playlistMode ? Boolean(playlist?.length) : canPlaySentence;

  const currentIndex = playlistState?.currentIndex ?? 0;
  const isPlaylistActive = Boolean(playlistState && playlistMode);

  const handlePlay = async () => {
    if (!audioUnlocked) {
      await unlockAudio();
      if (!audioSession.isUnlocked()) return;
    }
    audioSession.setPlaybackRate(speed);
    if (playlistMode && playlist?.length) {
      audioSession.setLoop(loop);
      await audioSession.playPlaylist(
        playlist,
        pauseMs,
        onPlaylistIndex,
        shadowPause ? pauseMs : 0
      );
    } else if (canPlaySentence) {
      audioSession.setLoop(loop);
      await audioSession.playSentence({
        sentenceId: sentenceId!,
        japanese: japanese!,
        reading,
        phonetic_reading,
        placeholders,
        learnerName: learnerJapaneseName,
        dialect,
        register,
        tags,
        context_notes,
        english,
      });
    }
  };

  const handleMainClick = async () => {
    if (audioState === "playing") {
      audioSession.pause();
      return;
    }
    if (audioState === "paused") {
      audioSession.resume();
      return;
    }
    await handlePlay();
  };

  const handlePrev = () => {
    if (!isPlaylistActive) return;
    audioSession.jumpToPlaylistItem(currentIndex - 1);
    onPlaylistIndex?.(currentIndex - 1);
  };

  const handleNext = () => {
    if (!isPlaylistActive) return;
    audioSession.jumpToPlaylistItem(currentIndex + 1);
    onPlaylistIndex?.(currentIndex + 1);
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    audioSession.setPlaybackRate(s);
  };

  const handlePauseChange = (ms: number) => {
    setPauseMs(ms);
  };

  const isPlaying = audioState === "playing";
  const isLoading = audioState === "loading";

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-sm", className)}>
      {/* Waveform visualiser */}
      <div className="mb-4 flex items-center justify-center gap-1">
        <div className="flex h-8 items-end gap-0.5">
          {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full bg-foreground/30 transition-all duration-300",
                isPlaying && "animate-pulse bg-foreground"
              )}
              style={{ height: `${h * 3}px` }}
            />
          ))}
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Loop */}
        <Button
          size="icon"
          variant={loop ? "soft" : "outline"}
          disabled={!canPlay}
          onClick={() => {
            const next = !loop;
            setLoop(next);
            audioSession.setLoop(next);
          }}
          title="Loop"
        >
          <Repeat className="h-5 w-5" />
        </Button>

        {/* Prev (playlist only) */}
        {playlistMode && (
          <Button
            size="icon"
            variant="outline"
            disabled={!isPlaylistActive || currentIndex <= 0}
            onClick={handlePrev}
            title="Previous sentence"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
        )}

        {/* Play / Pause */}
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-md"
          onClick={handleMainClick}
          loading={isLoading}
          disabled={!canPlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>

        {/* Next (playlist only) */}
        {playlistMode && (
          <Button
            size="icon"
            variant="outline"
            disabled={
              !isPlaylistActive ||
              currentIndex >= (playlistState?.items.length ?? 1) - 1
            }
            onClick={handleNext}
            title="Next sentence"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        )}

        {/* Queue toggle */}
        {playlist && (
          <Button
            size="icon"
            variant={showQueue ? "soft" : "outline"}
            onClick={() => setShowQueue(!showQueue)}
            title="Show queue"
          >
            <ListMusic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* No audio warning */}
      {!canPlay && (
        <p className="mt-3 text-center text-xs text-muted">
          Audio unavailable for this sentence. Try retranslating it from the library.
        </p>
      )}

      {/* ── Customisation options ────────────────────────────────── */}
      <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">

        {/* Playlist toggle */}
        {playlist && (
          <div className="flex items-center justify-between">
            <Label htmlFor="playlist-mode" className="flex items-center gap-2 text-sm text-muted">
              <ListMusic className="h-4 w-4" />
              Playlist mode
            </Label>
            <Switch id="playlist-mode" checked={playlistMode} onCheckedChange={setPlaylistMode} />
          </div>
        )}

        {/* Playback speed */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <GaugeCircle className="h-3.5 w-3.5" />
            Speed
          </p>
          <div className="flex gap-1.5">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  "flex-1 rounded-lg py-1 text-xs font-medium transition-colors",
                  speed === s
                    ? "bg-foreground text-background"
                    : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
                )}
              >
                {s === 1.0 ? "1×" : `${s}×`}
              </button>
            ))}
          </div>
        </div>

        {/* Pause between sentences (playlist mode only) */}
        {playlistMode && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Timer className="h-3.5 w-3.5" />
              Pause between sentences
            </p>
            <div className="flex gap-1.5">
              {PAUSE_OPTIONS.map(({ label, ms }) => (
                <button
                  key={ms}
                  onClick={() => handlePauseChange(ms)}
                  className={cn(
                    "flex-1 rounded-lg py-1 text-xs font-medium transition-colors",
                    pauseMs === ms
                      ? "bg-foreground text-background"
                      : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Queue panel ─────────────────────────────────────────── */}
      {playlist && showQueue && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">
              Queue · {playlist.length} sentences
            </p>
            <button
              onClick={() => setShowQueue(false)}
              className="text-muted hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div ref={queueRef} className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {playlist.map((item, i) => {
              const isActive = isPlaylistActive && i === currentIndex;
              return (
                <button
                  key={item.sentenceId}
                  data-queue-active={isActive}
                  onClick={() => {
                    audioSession.jumpToPlaylistItem(i);
                    onPlaylistIndex?.(i);
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background font-medium"
                      : "text-foreground hover:bg-border/60"
                  )}
                >
                  <span className="mr-2 tabular-nums text-xs opacity-60">{i + 1}</span>
                  <span className="font-japanese">{item.japanese}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
