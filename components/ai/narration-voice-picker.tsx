"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_SPEAKER_VOICES,
  NARRATION_VOICE_CATALOG,
  type NarrationVoiceId,
} from "@/lib/constants/narration-voices";
import { cn } from "@/lib/utils";

type VoiceRow = {
  id: NarrationVoiceId;
  label: string;
  description: string;
};

export function NarrationVoicePicker({
  allowsVoiceSelection,
  value,
  onChange,
}: {
  allowsVoiceSelection: boolean;
  value: { A: string; B: string };
  onChange: (next: { A: string; B: string }) => void;
}) {
  const [voices, setVoices] = useState<VoiceRow[]>(
    NARRATION_VOICE_CATALOG.slice(0, 2).map((v) => ({
      id: v.id,
      label: v.label,
      description: v.description,
    }))
  );
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useMemo(() => {
    if (typeof Audio === "undefined") return null;
    return new Audio();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/audio/voice-preview")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { voices?: VoiceRow[] };
        if (!cancelled && data.voices?.length) setVoices(data.voices);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      audio?.pause();
    };
  }, [audio]);

  async function preview(voiceId: string) {
    if (!audio) return;
    if (playing === voiceId) {
      audio.pause();
      setPlaying(null);
      return;
    }
    try {
      audio.pause();
      audio.src = `/api/audio/voice-preview?voiceId=${encodeURIComponent(voiceId)}`;
      setPlaying(voiceId);
      await audio.play();
      audio.onended = () => setPlaying(null);
    } catch {
      setPlaying(null);
    }
  }

  if (!allowsVoiceSelection) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 px-3 py-3 text-sm text-muted">
        Using default auto-paired voices.{" "}
        <Link
          href="/billing/checkout?plan=pro"
          className="font-medium text-foreground underline decoration-foreground/30 underline-offset-2"
        >
          Pro unlocks voice selection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Narration voices</p>
      {(["A", "B"] as const).map((speaker) => (
        <div key={speaker} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Speaker {speaker}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {voices.map((voice) => {
              const selected = value[speaker] === voice.id;
              return (
                <div
                  key={`${speaker}-${voice.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 transition-colors",
                    selected
                      ? "border-foreground bg-foreground/5"
                      : "border-border"
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      onChange({ ...value, [speaker]: voice.id })
                    }
                  >
                    <p className="text-sm font-medium">{voice.label}</p>
                    <p className="text-xs text-muted">{voice.description}</p>
                  </button>
                      <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground touch-manipulation"
                    aria-label={`Preview ${voice.label}`}
                    onClick={() => void preview(voice.id)}
                  >
                    {playing === voice.id ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { DEFAULT_SPEAKER_VOICES };
