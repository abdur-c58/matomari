"use client";

import { useEffect, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { audioSession } from "@/lib/audio/audio-session";
import type { AudioSessionState } from "@/types/audio";
import type { PlaylistState } from "@/lib/audio/audio-session";
import { cn } from "@/lib/utils";

export function GlobalAudioPlayer() {
  const [audioState, setAudioState] = useState<AudioSessionState>("locked");
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(null);

  useEffect(() => {
    const stateListener = (state: AudioSessionState) => setAudioState(state);
    audioSession.setListener(stateListener);
    audioSession.addPlaylistListener(setPlaylistState);
    return () => {
      audioSession.removeListener(stateListener);
      audioSession.removePlaylistListener(setPlaylistState);
    };
  }, []);

  const isActive = audioState === "playing" || audioState === "paused" || audioState === "loading";

  const current = playlistState
    ? playlistState.items[playlistState.currentIndex]
    : null;

  const label = current?.japanese ?? current?.english ?? "Playing audio…";
  const position = playlistState
    ? `${playlistState.currentIndex + 1} / ${playlistState.items.length}`
    : null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="global-audio-player"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
          role="region"
          aria-label="Audio player"
        >
          <div
            className={cn(
              "flex min-w-[260px] max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl",
              "border border-border/50 bg-surface/95 backdrop-blur-xl"
            )}
          >
            {/* Waveform indicator */}
            <div className="flex h-6 shrink-0 items-end gap-[2px]">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full bg-foreground/30 transition-all duration-300",
                    audioState === "playing" && "animate-pulse bg-foreground"
                  )}
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>

            {/* Track info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground font-japanese leading-tight">
                {label}
              </p>
              {position && (
                <p className="mt-0.5 text-xs tabular-nums text-muted">
                  {position}
                </p>
              )}
            </div>

            {/* Play / Pause */}
            <button
              onClick={() => {
                if (audioState === "playing") audioSession.pause();
                else if (audioState === "paused") audioSession.resume();
              }}
              disabled={audioState === "loading"}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                "bg-foreground text-background transition-opacity hover:opacity-80",
                audioState === "loading" && "opacity-50"
              )}
              aria-label={audioState === "playing" ? "Pause" : "Play"}
            >
              {audioState === "playing" ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current ml-px" />
              )}
            </button>

            {/* Stop */}
            <button
              onClick={() => audioSession.stopPlaylist()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-foreground"
              aria-label="Stop audio"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
