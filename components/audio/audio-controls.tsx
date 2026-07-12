"use client";

import { useState } from "react";
import { Play, Pause, Repeat, ListMusic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useApp } from "@/components/providers/app-provider";
import { audioSession, type TtsRequest } from "@/lib/audio/audio-session";
import { getTtsTextFromFields } from "@/lib/audio/tts-text";
import type { SentencePlaceholder } from "@/types/sentence";
import { useLearnerName } from "@/hooks/use-learner-name";
import { cn } from "@/lib/utils";

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
  const learnerName = useLearnerName();
  const dialect = progress.settings.dialect;
  const [loop, setLoop] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);

  const canPlaySentence = Boolean(
    sentenceId &&
      getTtsTextFromFields(japanese, reading, {
        dialect,
        phonetic_reading,
        placeholders,
        learnerName,
      })
  );
  const canPlay = playlistMode ? Boolean(playlist?.length) : canPlaySentence;

  if (!audioUnlocked) {
    return (
      <Button className={cn("w-full", className)} size="lg" onClick={unlockAudio}>
        <Volume2 className="mr-2 h-5 w-5" />
        Tap to enable audio
      </Button>
    );
  }

  const handlePlay = async () => {
    if (playlistMode && playlist?.length) {
      audioSession.setLoop(loop);
      await audioSession.playPlaylist(
        playlist,
        1500,
        onPlaylistIndex,
        shadowPause ? 3000 : 0
      );
    } else if (canPlaySentence) {
      audioSession.setLoop(loop);
      await audioSession.playSentence({
        sentenceId: sentenceId!,
        japanese: japanese!,
        reading,
        phonetic_reading,
        placeholders,
        learnerName,
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

  const isPlaying = audioState === "playing";
  const isLoading = audioState === "loading";

  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-sm", className)}>
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

      <div className="flex items-center justify-center gap-3">
        <Button
          size="icon"
          variant={loop ? "soft" : "outline"}
          disabled={!canPlay}
          onClick={() => {
            const next = !loop;
            setLoop(next);
            audioSession.setLoop(next);
          }}
        >
          <Repeat className="h-5 w-5" />
        </Button>
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
        {playlist && (
          <Button
            size="icon"
            variant={playlistMode ? "soft" : "outline"}
            onClick={() => setPlaylistMode(!playlistMode)}
          >
            <ListMusic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {!canPlay && (
        <p className="mt-3 text-center text-xs text-muted">
          Audio unavailable for this sentence. Try retranslating it from the library.
        </p>
      )}

      {playlist && (
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
          <Label htmlFor="playlist-mode" className="flex items-center gap-2 text-sm text-muted">
            <ListMusic className="h-4 w-4" /> Playlist
          </Label>
          <Switch id="playlist-mode" checked={playlistMode} onCheckedChange={setPlaylistMode} />
        </div>
      )}
    </div>
  );
}
