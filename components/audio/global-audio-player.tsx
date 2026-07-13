"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { audioSession } from "@/lib/audio/audio-session";
import type { AudioSessionState } from "@/types/audio";
import type { PlaylistState } from "@/lib/audio/audio-session";
import { cn } from "@/lib/utils";

export function GlobalAudioPlayer() {
  const [audioState, setAudioState] = useState<AudioSessionState>("locked");
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(null);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const stateListener = (state: AudioSessionState) => {
      setAudioState(state);
      setUserPaused(audioSession.isUserPaused());
    };
    const playlistListener = (state: PlaylistState | null) => {
      setPlaylistState(state);
      setUserPaused(audioSession.isUserPaused());
    };

    audioSession.setListener(stateListener);
    audioSession.addPlaylistListener(playlistListener);
    return () => {
      audioSession.removeListener(stateListener);
      audioSession.removePlaylistListener(playlistListener);
    };
  }, []);

  const playlistActive = playlistState !== null;
  const isActive =
    playlistActive ||
    audioState === "playing" ||
    audioState === "paused" ||
    audioState === "loading";

  const current = playlistState
    ? playlistState.items[playlistState.currentIndex]
    : null;

  const label = current?.japanese ?? current?.english ?? "Playing audio…";
  const album = playlistState?.albumTitle;
  const position = playlistState
    ? `${playlistState.currentIndex + 1} / ${playlistState.items.length}`
    : null;
  const canSkip = (playlistState?.items.length ?? 0) > 1;
  const showPaused =
    userPaused || audioState === "paused" || (playlistActive && audioSession.isUserPaused());

  const handlePlayPause = () => {
    if (showPaused) audioSession.resume();
    else audioSession.pause();
    setUserPaused(audioSession.isUserPaused());
  };

  const handlePrevious = () => {
    audioSession.previousTrack();
    setUserPaused(audioSession.isUserPaused());
  };

  const handleNext = () => {
    audioSession.nextTrack();
    setUserPaused(audioSession.isUserPaused());
  };

  const handleStop = () => {
    audioSession.stopPlaylist();
    setUserPaused(false);
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="global-audio-player"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-4 left-1/2 z-50 w-[min(100vw-2rem,24rem)] -translate-x-1/2"
          role="region"
          aria-label="Audio player"
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-3 shadow-2xl sm:gap-3 sm:px-4",
              "border border-border/50 bg-surface/95 backdrop-blur-xl"
            )}
          >
            <div className="flex h-6 shrink-0 items-end gap-[2px]">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full bg-foreground/30 transition-all duration-300",
                    !showPaused && audioState !== "loading" && "animate-pulse bg-foreground"
                  )}
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-foreground font-japanese">
                {label}
              </p>
              {(album || position) && (
                <p className="mt-0.5 truncate text-xs text-muted">
                  {album ? (
                    <>
                      {album}
                      {position ? ` · ${position}` : null}
                    </>
                  ) : (
                    position
                  )}
                </p>
              )}
            </div>

            {playlistActive && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={!canSkip || audioState === "loading"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  canSkip
                    ? "text-foreground hover:bg-border"
                    : "cursor-not-allowed text-muted/40"
                )}
                aria-label="Previous sentence"
              >
                <SkipBack className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handlePlayPause}
              disabled={audioState === "loading"}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                "bg-foreground text-background transition-opacity hover:opacity-80",
                audioState === "loading" && "opacity-50"
              )}
              aria-label={showPaused ? "Resume" : "Pause"}
            >
              {showPaused ? (
                <Play className="ml-px h-3.5 w-3.5 fill-current" />
              ) : (
                <Pause className="h-3.5 w-3.5 fill-current" />
              )}
            </button>

            {playlistActive && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canSkip || audioState === "loading"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  canSkip
                    ? "text-foreground hover:bg-border"
                    : "cursor-not-allowed text-muted/40"
                )}
                aria-label="Next sentence"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
              aria-label="Stop audio"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
