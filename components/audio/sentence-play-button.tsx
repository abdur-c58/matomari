"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { audioSession } from "@/lib/audio/audio-session";
import { getTtsTextFromFields } from "@/lib/audio/tts-text";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SentencePlayButton({
  sentenceId,
  japanese,
  reading,
  phonetic_reading,
  register,
  tags,
  context_notes,
  english,
  disabled = false,
  className,
}: {
  sentenceId: string;
  japanese?: string | null;
  reading?: string | null;
  phonetic_reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { audioUnlocked, unlockAudio, audioState, progress } = useApp();
  const [active, setActive] = useState(false);
  const dialect = progress.settings.dialect;

  const canPlay = Boolean(
    getTtsTextFromFields(japanese, reading, { dialect, phonetic_reading })
  );

  useEffect(() => {
    if (!active) return;
    if (audioState === "ready" || audioState === "paused" || audioState === "error") {
      setActive(false);
    }
  }, [audioState, active]);

  const loading = active && audioState === "loading";
  const playing = active && audioState === "playing";

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled || !japanese?.trim() || !canPlay) {
      if (!canPlay) {
        toast.error("This sentence needs a kana reading. Try retranslating it.");
      }
      return;
    }

    if (!audioUnlocked) {
      await unlockAudio();
      if (!audioSession.isUnlocked()) return;
    }

    audioSession.stopPlaylist();
    setActive(true);
    await audioSession.playSentence({
      sentenceId,
      japanese,
      reading,
      phonetic_reading,
      dialect,
      register,
      tags,
      context_notes,
      english,
    });
    if (audioSession.getState() === "error") {
      toast.error("Could not play audio");
      setActive(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled || !canPlay || loading}
      aria-label={playing ? "Playing sentence" : "Play sentence"}
      className={cn(
        "size-9 min-h-9 min-w-9 shrink-0 rounded-full p-0 px-0 text-foreground",
        playing && "border-mode-listen text-mode-listen",
        className
      )}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4 fill-current" strokeWidth={2} />
      )}
    </Button>
  );
}
