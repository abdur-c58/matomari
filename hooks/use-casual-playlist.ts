"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { audioSession } from "@/lib/audio/audio-session";
import { recordCasualListen } from "@/lib/services/casual-listen-service";
import {
  buildPlaylistFromSentences,
  buildPlaylistFromUnits,
} from "@/lib/services/study-playlist-service";
import { touchStudyUnit, type StudyUnitRef } from "@/lib/services/study-unit-service";
import type { Sentence } from "@/types/sentence";
import type { AudioSessionState } from "@/types/audio";

import type { Dialect } from "@/lib/constants/dialect";

export const DEFAULT_CASUAL_PAUSE_MS = 1200;
export const DEFAULT_CASUAL_PLAYBACK_RATE = 1;

export type CasualPlaylistOptions = {
  pauseMs?: number;
  playbackRate?: number;
  dialect?: Dialect;
  albumTitle?: string;
  onIndexChange?: (sentenceId: string, index: number) => void;
};

export function useCasualPlaylist() {
  const { dataset, progress, stats, setProgress, setStats, unlockAudio, userLibrary } =
    useApp();
  const [playing, setPlaying] = useState(false);
  const [playlistActive, setPlaylistActive] = useState(false);
  const [audioState, setAudioState] = useState<AudioSessionState>(audioSession.getState());

  useEffect(() => {
    const onState = (state: AudioSessionState) => setAudioState(state);
    const onPlaylist = (state: ReturnType<typeof audioSession.getPlaylistState>) =>
      setPlaylistActive(state !== null);

    audioSession.setListener(onState);
    audioSession.addPlaylistListener(onPlaylist);
    return () => {
      audioSession.removeListener(onState);
      audioSession.removePlaylistListener(onPlaylist);
    };
  }, []);

  const recordListen = useCallback(
    async (sentenceId: string) => {
      await setStats(recordCasualListen(stats, sentenceId));
    },
    [setStats, stats]
  );

  const stopPlaylist = useCallback(() => {
    audioSession.stopPlaylist();
  }, []);

  const pausePlaylist = useCallback(() => {
    audioSession.pause();
  }, []);

  const resumePlaylist = useCallback(() => {
    audioSession.resume();
  }, []);

  const playPlaylist = useCallback(
    async (
      sentences: Sentence[],
      unitRef?: StudyUnitRef,
      options?: CasualPlaylistOptions
    ) => {
      if (!dataset) return;
      const { playlist, skipped } = buildPlaylistFromSentences(sentences, progress, {
        dialect: options?.dialect,
        translations: userLibrary?.sentenceTranslations,
      });

      if (playlist.length === 0) {
        toast.error(
          skipped > 0
            ? "No translated sentences to play. Translate some first."
            : "No sentences to play."
        );
        return;
      }

      if (skipped > 0) {
        toast.message(`Skipping ${skipped} untranslated sentence${skipped === 1 ? "" : "s"}.`);
      }

      await unlockAudio();

      if (unitRef) {
        await setProgress((current) => touchStudyUnit(current, unitRef));
      }

      const pauseMs = options?.pauseMs ?? DEFAULT_CASUAL_PAUSE_MS;
      const playbackRate = options?.playbackRate ?? DEFAULT_CASUAL_PLAYBACK_RATE;
      audioSession.setPlaybackRate(playbackRate);

      setPlaying(true);
      try {
        await audioSession.playPlaylist(
          playlist,
          pauseMs,
          (index) => {
            const item = playlist[index];
            if (item) options?.onIndexChange?.(item.sentenceId, index);
          },
          0,
          {
            loop: true,
            albumTitle: options?.albumTitle,
            onSentencePlayed: (id) => {
              void recordListen(id);
            },
          }
        );
      } finally {
        setPlaying(false);
        options?.onIndexChange?.("", -1);
      }
    },
    [dataset, progress, recordListen, setProgress, unlockAudio, userLibrary?.sentenceTranslations]
  );

  const playUnits = useCallback(
    async (refs: StudyUnitRef[], options?: CasualPlaylistOptions) => {
      if (!dataset || refs.length === 0) return;
      const { playlist, skipped } = buildPlaylistFromUnits(dataset, progress, refs, {
        dialect: options?.dialect,
        translations: userLibrary?.sentenceTranslations,
      });

      if (playlist.length === 0) {
        toast.error("No translated sentences in selection.");
        return;
      }

      if (skipped > 0) {
        toast.message(`Skipping ${skipped} untranslated sentence${skipped === 1 ? "" : "s"}.`);
      }

      await unlockAudio();

      const pauseMs = options?.pauseMs ?? DEFAULT_CASUAL_PAUSE_MS;
      const playbackRate = options?.playbackRate ?? DEFAULT_CASUAL_PLAYBACK_RATE;
      audioSession.setPlaybackRate(playbackRate);

      setPlaying(true);
      try {
        await audioSession.playPlaylist(
          playlist,
          pauseMs,
          (index) => {
            const item = playlist[index];
            if (item) options?.onIndexChange?.(item.sentenceId, index);
          },
          0,
          {
            loop: true,
            albumTitle: options?.albumTitle,
            onSentencePlayed: (id) => {
              void recordListen(id);
            },
          }
        );
      } finally {
        setPlaying(false);
        options?.onIndexChange?.("", -1);
      }
    },
    [dataset, progress, recordListen, unlockAudio, userLibrary?.sentenceTranslations]
  );

  const isPaused = audioState === "paused" || audioSession.isUserPaused();

  return {
    playPlaylist,
    playUnits,
    playing,
    playlistActive,
    isPaused,
    stopPlaylist,
    pausePlaylist,
    resumePlaylist,
  };
}
