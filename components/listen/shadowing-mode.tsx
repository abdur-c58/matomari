"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Square, Play } from "lucide-react";
import type { Sentence } from "@/types/sentence";
import { SentenceDisplay } from "./sentence-display";
import { AudioControls } from "@/components/audio/audio-controls";
import { Button } from "@/components/ui/button";
import { ResponsivePageShell } from "@/components/layout/responsive-page-shell";
import { ResponsivePageHeader } from "@/components/layout/responsive-page-header";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { AskButton } from "@/components/ai/ask-button";
import { SentenceContextPanel } from "@/components/study/sentence-context-panel";
import { ShortcutsHint } from "@/components/layout/shortcuts-hint";
import { useDesktopShortcuts } from "@/hooks/use-desktop-shortcuts";
import { useTutor } from "@/components/ai/tutor-provider";
import { useApp } from "@/components/providers/app-provider";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { getNextStepAfterShadow } from "@/lib/services/study-flow-service";
import { startModeSession, endModeSession } from "@/lib/sync/sync-service";
import { audioSession, type TtsRequest } from "@/lib/audio/audio-session";
import { toast } from "sonner";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { cn } from "@/lib/utils";

export function ShadowingMode({ sentences }: { sentences: Sentence[] }) {
  const router = useRouter();
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  const { audioUnlocked, audioState, progress, dataset } = useApp();
  const learnerJapaneseName = useLearnerJapaneseName();
  const { closeTutor } = useTutor();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shadowing, setShadowing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [userRecordingUrl, setUserRecordingUrl] = useState<string | null>(null);
  const [playingRecording, setPlayingRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const current = sentences[currentIndex] ?? sentences[0];
  const dialect = getPrimaryTranslation(progress.settings);
  const playlist: TtsRequest[] = sentences
    .filter((s) => s.japanese)
    .map((s) => ({
      sentenceId: s.id,
      japanese: s.japanese!,
      reading: s.reading,
      phonetic_reading: s.phonetic_reading,
      placeholders: s.placeholders,
      learnerName: learnerJapaneseName,
      dialect,
      register: s.register,
      tags: s.tags,
      context_notes: s.context_notes,
      english: s.english,
    }));

  useEffect(() => {
    startModeSession("shadow").then((id) => {
      sessionIdRef.current = id;
    });
    return () => {
      if (sessionIdRef.current) endModeSession(sessionIdRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUserRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMicDenied(false);
    } catch {
      setMicDenied(true);
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const playRecording = () => {
    if (!userRecordingUrl) return;
    if (!userAudioRef.current) {
      userAudioRef.current = new Audio(userRecordingUrl);
    }
    userAudioRef.current.play();
    setPlayingRecording(true);
    userAudioRef.current.onended = () => setPlayingRecording(false);
  };

  useDesktopShortcuts({
    onSpace: () => {
      if (audioState === "playing") audioSession.pause();
      else if (audioState === "paused") audioSession.resume();
    },
    onEscape: closeTutor,
  });

  return (
    <ResponsivePageShell>
      <ResponsivePageHeader
        title="Listen & Shadow"
        subtitle={`${currentIndex + 1} / ${sentences.length}`}
        backHref="/"
        action={
          current ? (
            <AskButton
              context={{ type: "sentence", sentenceId: current.id }}
              size="icon"
              variant="ghost"
            />
          ) : undefined
        }
      />

      <p className="mb-4 text-sm text-muted">
        Play each sentence, pause, and repeat aloud. Match rhythm and intonation.
      </p>

      {!isMobile && (
        <ShortcutsHint
          shortcuts={[
            { keys: "Space", label: "Play / pause" },
            { keys: "Esc", label: "Close tutor" },
          ]}
        />
      )}

      {current && (
        <div className={cn(!isMobile && "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-8")}>
          <div>
          <SentenceDisplay sentence={current} shadowing={shadowing} />

          <div className="mt-6">
            <AudioControls
              sentenceId={current.id}
              japanese={current.japanese}
              reading={current.reading}
              phonetic_reading={current.phonetic_reading}
              placeholders={current.placeholders}
              register={current.register}
              tags={current.tags}
              context_notes={current.context_notes}
              english={current.english}
              playlist={playlist}
              shadowPause
              onPlaylistIndex={(i) => {
                setCurrentIndex(i);
                setShadowing(true);
                setTimeout(() => setShadowing(false), 3000);
              }}
            />
          </div>

          <div className="mt-6 space-y-3">
            <Button
              variant={recording ? "destructive" : "secondary"}
              className={cn(isMobile ? "w-full" : "w-auto")}
              onClick={recording ? stopRecording : startRecording}
              disabled={!audioUnlocked}
            >
              {recording ? (
                <>
                  <Square className="mr-2 h-4 w-4 fill-current" /> Stop recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" /> Record shadow
                </>
              )}
            </Button>

            {micDenied && (
              <p className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
                Mic unavailable. Enable in Safari Settings → Website Settings.
              </p>
            )}

            {userRecordingUrl && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="mb-3 text-sm font-medium text-muted">Compare your recording</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" size="sm" onClick={playRecording}>
                    <Play className="mr-2 h-4 w-4" />
                    {playingRecording ? "Playing..." : "Your voice"}
                  </Button>
                  <Button variant="soft" className="flex-1" size="sm" disabled>
                    Original
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className={cn(isMobile ? "w-full" : "w-auto")}
              onClick={() => {
                const next = getNextStepAfterShadow(dataset, progress);
                router.push(next.href);
              }}
            >
              Done shadowing
            </Button>
          </div>
          </div>
          {!isMobile && <SentenceContextPanel sentence={current} />}
        </div>
      )}
    </ResponsivePageShell>
  );
}
