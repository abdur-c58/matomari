"use client";

import { useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audioSession } from "@/lib/audio/audio-session";

const NOT_FOUND_JA = "このページは見つかりませんでした。";
const NOT_FOUND_READING = "このページはみつかりませんでした。";

/**
 * Fun one-off line for the 404 page.
 * `cacheBySpokenScript` lets the existing audio layer reuse the generated clip
 * after the first successful fetch/generation for the same spoken text.
 */
export function NotFoundAudioButton() {
  const [loading, setLoading] = useState(false);

  async function play() {
    setLoading(true);
    try {
      await audioSession.unlockAudio();
      await audioSession.playSentence(
        {
          sentenceId: "system:not-found-ja",
          japanese: NOT_FOUND_JA,
          reading: NOT_FOUND_READING,
          cacheBySpokenScript: true,
        },
        { albumTitle: "404" }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={loading}
      onClick={() => void play()}
      className="rounded-full"
      aria-label="Play Japanese 404 line"
    >
      {loading ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      Hear it
    </Button>
  );
}
