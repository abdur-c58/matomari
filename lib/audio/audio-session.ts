"use client";

import type { AudioSessionState } from "@/types/audio";
import { getCachedAudio, saveCachedAudio } from "@/lib/db/audio-cache-repository";
import { getTextHashAsync } from "@/lib/audio/hash";
import { getSpokenScriptFromFields } from "@/lib/audio/tts-text";
import { stripTtsMarkup } from "@/lib/audio/tts-prosody";

export interface TtsRequest {
  sentenceId: string;
  japanese: string;
  reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
}

type StateListener = (state: AudioSessionState, error?: string) => void;

export class AudioSessionManager {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private unlocked = false;
  private state: AudioSessionState = "locked";
  private listener: StateListener | null = null;
  private loopEnabled = false;
  private playlistAbort: AbortController | null = null;

  setListener(listener: StateListener) {
    this.listener = listener;
    listener(this.state);
  }

  private setState(state: AudioSessionState, error?: string) {
    this.state = state;
    this.listener?.(state, error);
  }

  getState() {
    return this.state;
  }

  isUnlocked() {
    return this.unlocked;
  }

  async unlockAudio(): Promise<void> {
    if (this.unlocked) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      this.unlocked = true;
      this.setState("ready");
    } catch {
      this.setState("error", "Could not unlock audio. Tap again.");
    }
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener("ended", () => {
        if (!this.loopEnabled) this.setState("ready");
      });
      this.audio.addEventListener("play", () => this.setState("playing"));
      this.audio.addEventListener("pause", () => {
        if (this.state !== "loading") this.setState("paused");
      });
      this.audio.addEventListener("error", () =>
        this.setState("error", "Playback failed")
      );
    }
    return this.audio;
  }

  setLoop(enabled: boolean) {
    this.loopEnabled = enabled;
    if (this.audio) this.audio.loop = enabled;
  }

  stopPlaylist() {
    this.playlistAbort?.abort();
    this.playlistAbort = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.setState("ready");
  }

  private resolveSpokenText(request: TtsRequest): string | null {
    return getSpokenScriptFromFields(request);
  }

  async fetchAudioBlob(request: TtsRequest): Promise<Blob> {
    const spokenText = this.resolveSpokenText(request);
    if (!spokenText) {
      throw new Error("Missing kana reading for pronunciation");
    }

    const textHash = await getTextHashAsync(request.sentenceId, spokenText);
    const cached = await getCachedAudio(request.sentenceId);
    if (cached && cached.textHash === textHash) {
      return cached.blob;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Audio not cached for offline playback");
    }

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentenceId: request.sentenceId,
        japanese: request.japanese,
        reading: request.reading,
        register: request.register,
        tags: request.tags,
        context_notes: request.context_notes,
        english: request.english,
      }),
    });

    if (!response.ok) {
      if (response.status === 422) {
        throw new Error("This sentence needs a kana reading. Try retranslating it.");
      }
      if (response.status === 503) {
        return this.synthesizeWithWebSpeech(spokenText);
      }
      throw new Error("Failed to fetch audio");
    }

    const blob = await response.blob();
    const serverHash = response.headers.get("X-Audio-Hash");
    const cacheHash =
      serverHash ?? (await getTextHashAsync(request.sentenceId, spokenText));
    await saveCachedAudio({
      sentenceId: request.sentenceId,
      textHash: cacheHash,
      blob,
      createdAt: new Date().toISOString(),
    });
    return blob;
  }

  private synthesizeWithWebSpeech(spokenText: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("No TTS available"));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(stripTtsMarkup(spokenText));
      utterance.lang = "ja-JP";
      const voices = speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
      if (jaVoice) utterance.voice = jaVoice;

      utterance.onend = () => {
        resolve(new Blob([], { type: "audio/mpeg" }));
      };
      utterance.onerror = () => reject(new Error("Web Speech failed"));

      speechSynthesis.speak(utterance);
    });
  }

  async playSentence(request: TtsRequest): Promise<void> {
    const spokenText = this.resolveSpokenText(request);
    if (!spokenText) {
      this.setState("error", "Missing kana reading for pronunciation");
      return;
    }

    if (!this.unlocked) {
      this.setState("locked");
      return;
    }

    this.setState("loading");
    try {
      const audio = this.ensureAudio();
      const blob = await this.fetchAudioBlob(request);

      if (blob.size === 0) {
        await this.speakWebSpeech(spokenText);
        this.setState("ready");
        return;
      }

      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.loop = this.loopEnabled;
      await audio.play();
    } catch (e) {
      try {
        await this.speakWebSpeech(spokenText);
        this.setState("ready");
      } catch {
        this.setState("error", e instanceof Error ? e.message : "Playback error");
      }
    }
  }

  private speakWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("No speech"));
        return;
      }
      const u = new SpeechSynthesisUtterance(stripTtsMarkup(text));
      u.lang = "ja-JP";
      u.onend = () => resolve();
      u.onerror = () => reject(new Error("Speech failed"));
      speechSynthesis.speak(u);
    });
  }

  pause() {
    this.audio?.pause();
  }

  resume() {
    this.audio?.play();
  }

  async playPlaylist(
    items: TtsRequest[],
    pauseMs = 1500,
    onItemChange?: (index: number) => void,
    shadowPauseMs = 0
  ): Promise<void> {
    this.playlistAbort?.abort();
    const abort = new AbortController();
    this.playlistAbort = abort;

    for (let i = 0; i < items.length; i++) {
      if (abort.signal.aborted) break;
      onItemChange?.(i);
      await this.playSentence(items[i]);

      await this.waitForAudioEnd(abort.signal);

      if (shadowPauseMs > 0) {
        await this.delay(shadowPauseMs, abort.signal);
      } else {
        await this.delay(pauseMs, abort.signal);
      }
    }

    if (!abort.signal.aborted && this.loopEnabled) {
      await this.playPlaylist(items, pauseMs, onItemChange, shadowPauseMs);
    }
  }

  private waitForAudioEnd(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const audio = this.audio;
      if (!audio || audio.paused) {
        resolve();
        return;
      }
      const onEnd = () => {
        audio.removeEventListener("ended", onEnd);
        resolve();
      };
      audio.addEventListener("ended", onEnd);
      signal.addEventListener("abort", () => {
        audio.removeEventListener("ended", onEnd);
        resolve();
      });
    });
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

export const audioSession = new AudioSessionManager();
