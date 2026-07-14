"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { audioSession, type TtsRequest } from "@/lib/audio/audio-session";
import { getTtsTextFromFields } from "@/lib/audio/tts-text";
import type { NarrationSpeaker, SentencePlaceholder } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import type { AudioSessionState } from "@/types/audio";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SentenceAudioFields = {
  sentenceId: string;
  japanese?: string | null;
  reading?: string | null;
  phonetic_reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  placeholders?: SentencePlaceholder[];
  dialect?: Dialect;
  speaker?: NarrationSpeaker;
  disabled?: boolean;
  className?: string;
  appearance?: "default" | "minimal";
};

function buildTtsRequest(
  fields: SentenceAudioFields,
  dialect: Dialect,
  learnerJapaneseName: string | null
): TtsRequest {
  return {
    sentenceId: fields.sentenceId,
    japanese: fields.japanese!,
    reading: fields.reading,
    phonetic_reading: fields.phonetic_reading,
    placeholders: fields.placeholders,
    learnerName: learnerJapaneseName,
    dialect,
    speaker: fields.speaker === "B" ? "B" : "A",
    register: fields.register,
    tags: fields.tags,
    context_notes: fields.context_notes,
    english: fields.english,
    ttsSource: "surface",
  };
}

export function SentenceAudioControls({
  sentenceId,
  japanese,
  reading,
  phonetic_reading,
  register,
  tags,
  context_notes,
  english,
  placeholders,
  dialect: dialectProp,
  speaker,
  disabled = false,
  className,
  appearance = "default",
}: SentenceAudioFields) {
  const { audioUnlocked, unlockAudio, audioState, progress } = useApp();
  const learnerJapaneseName = useLearnerJapaneseName();
  const [active, setActive] = useState(false);
  const dialect = dialectProp ?? getPrimaryTranslation(progress.settings);

  const canPlay = Boolean(
    japanese?.trim() &&
      getTtsTextFromFields(japanese, reading, {
        dialect,
        phonetic_reading,
        placeholders,
        learnerName: learnerJapaneseName,
        ttsSource: "surface",
      })
  );

  const loading = active && audioState === "loading";
  const playing = active && audioState === "playing";

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled || !canPlay) {
      toast.error("Audio unavailable for this sentence.");
      return;
    }

    if (!audioUnlocked) {
      await unlockAudio();
      if (!audioSession.isUnlocked()) return;
    }

    audioSession.stopPlaylist();
    setActive(true);

    const onStateChange = (state: AudioSessionState) => {
      if (state === "ready" || state === "paused" || state === "error") {
        setActive(false);
        audioSession.removeListener(onStateChange);
      }
    };
    audioSession.setListener(onStateChange);

    const request = buildTtsRequest(
      {
        sentenceId,
        japanese,
        reading,
        phonetic_reading,
        register,
        tags,
        context_notes,
        english,
        placeholders,
        dialect,
        speaker,
      },
      dialect,
      learnerJapaneseName
    );

    await audioSession.playSentence(request);
    if (audioSession.getState() === "error") {
      toast.error("Could not play audio");
      setActive(false);
      audioSession.removeListener(onStateChange);
    }
  };

  const isMinimal = appearance === "minimal";

  return (
    <Button
      type="button"
      variant={isMinimal ? "ghost" : "outline"}
      size="icon"
      disabled={disabled || !canPlay || loading}
      aria-label={playing ? "Playing sentence" : "Play sentence"}
      data-long-press-ignore
      className={cn(
        isMinimal
          ? "h-6 min-h-6 w-6 min-w-6 shrink-0 rounded-none border-0 bg-transparent p-0 text-muted shadow-none hover:bg-transparent hover:text-foreground"
          : "size-9 min-h-9 min-w-9 shrink-0 rounded-full p-0 px-0 text-foreground",
        playing && (isMinimal ? "text-mode-listen" : "border-mode-listen text-mode-listen"),
        className
      )}
      onClick={handlePlay}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin", isMinimal ? "h-3.5 w-3.5" : "h-4 w-4")} />
      ) : (
        <Play
          className={cn("fill-current", isMinimal ? "h-3.5 w-3.5" : "h-4 w-4")}
          strokeWidth={2}
        />
      )}
    </Button>
  );
}

/** @deprecated Use SentenceAudioControls */
export function SentencePlayButton(props: SentenceAudioFields) {
  return <SentenceAudioControls {...props} />;
}
