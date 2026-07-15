"use client";

import type { AudioSessionState } from "@/types/audio";
import type { Dialect } from "@/lib/constants/dialect";
import type { FishAudioDirectives } from "@/lib/audio/fish-audio-cues";
import type { NarrationSpeaker, SentencePlaceholder } from "@/types/sentence";
import {
  deleteCachedAudio,
  getCachedAudio,
  getCachedAudioByTextHash,
  saveCachedAudio,
} from "@/lib/db/audio-cache-repository";
import {
  getOfflineAsset,
  getOfflineAssetBySentenceId,
} from "@/lib/db/offline-audio-repository";
import { getTextHashAsync } from "@/lib/audio/hash";
import { getSpokenScriptFromFields, type TtsScriptSource } from "@/lib/audio/tts-text";
import { stripTtsMarkup } from "@/lib/audio/tts-prosody";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import {
  bindMediaSessionActions,
  clearMediaSession,
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState,
} from "@/lib/audio/media-session";

export interface TtsRequest {
  sentenceId: string;
  japanese: string;
  reading?: string | null;
  phonetic_reading?: string | null;
  placeholders?: SentencePlaceholder[];
  learnerName?: string | null;
  dialect?: Dialect;
  /** Narration speaker voice (defaults to A). */
  speaker?: NarrationSpeaker;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  /** Authored Fish cues — compiled into spoken script only. */
  fishAudio?: FishAudioDirectives;
  /** Free-form Fish instruction tags (preferred). */
  paralinguisticTags?: string[];
  /** Narration audio reuses identical final scripts across sentence/island IDs. */
  cacheBySpokenScript?: boolean;
  /** Per-turn playlist wait after this item (narration). */
  pauseAfterMs?: number;
  /** Default surface (kanji sentence). Use "reading" for kana-only fallback. */
  ttsSource?: TtsScriptSource;
  forceRegenerate?: boolean;
}

export interface PlaylistState {
  items: TtsRequest[];
  currentIndex: number;
  pauseMs: number;
  albumTitle?: string;
}

type StateListener = (state: AudioSessionState, error?: string) => void;
type PlaylistListener = (state: PlaylistState | null) => void;

export class AudioSessionManager {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private unlocked = false;
  private state: AudioSessionState = "locked";
  private listeners: Set<StateListener> = new Set();
  private playlistListeners: Set<PlaylistListener> = new Set();
  private loopEnabled = false;
  private playlistLoopEnabled = false;
  private playlistAbort: AbortController | null = null;
  private playlistState: PlaylistState | null = null;
  private _playbackRate = 1.0;
  private userPaused = false;
  private resumeWaiters: Array<() => void> = [];
  private _albumTitle?: string;
  private _singleAlbumTitle?: string;
  private mediaSessionBound = false;
  private objectUrlToRevoke: string | null = null;

  // ─── Legacy single-listener compat ─────────────────────────────────────────

  setListener(listener: StateListener) {
    // Keep the first listener slot for backward compatibility
    this.listeners.add(listener);
    listener(this.state);
  }

  removeListener(listener: StateListener) {
    this.listeners.delete(listener);
  }

  addPlaylistListener(listener: PlaylistListener) {
    this.playlistListeners.add(listener);
    listener(this.playlistState);
  }

  removePlaylistListener(listener: PlaylistListener) {
    this.playlistListeners.delete(listener);
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  private setState(state: AudioSessionState, error?: string) {
    this.state = state;
    this.listeners.forEach((l) => l(state, error));
  }

  private setPlaylistState(state: PlaylistState | null) {
    this.playlistState = state;
    this.playlistListeners.forEach((l) => l(state));
  }

  getState() {
    return this.state;
  }

  getPlaylistState(): PlaylistState | null {
    return this.playlistState;
  }

  isUnlocked() {
    return this.unlocked;
  }

  isUserPaused() {
    return this.userPaused;
  }

  canSkipTracks() {
    return (this.playlistState?.items.length ?? 0) > 1;
  }

  previousTrack() {
    const playlist = this.playlistState;
    if (!playlist || playlist.items.length <= 1) return;

    const prev = playlist.currentIndex - 1;
    if (prev < 0) {
      if (this.playlistLoopEnabled) {
        this.jumpToPlaylistItem(playlist.items.length - 1);
      }
      return;
    }

    this.jumpToPlaylistItem(prev);
  }

  nextTrack() {
    const playlist = this.playlistState;
    if (!playlist || playlist.items.length <= 1) return;

    const next = playlist.currentIndex + 1;
    if (next >= playlist.items.length) {
      if (this.playlistLoopEnabled) {
        this.jumpToPlaylistItem(0);
      }
      return;
    }

    this.jumpToPlaylistItem(next);
  }

  // ─── Playback rate ──────────────────────────────────────────────────────────

  setPlaybackRate(rate: number) {
    this._playbackRate = Math.max(0.25, Math.min(4, rate));
    if (this.audio) {
      this.audio.playbackRate = this._playbackRate;
    }
  }

  getPlaybackRate() {
    return this._playbackRate;
  }

  // ─── Audio unlock ───────────────────────────────────────────────────────────

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
      this.audio.preload = "auto";
      this.audio.setAttribute("playsinline", "true");
      this.audio.addEventListener("ended", () => {
        if (!this.loopEnabled) {
          if (this.playlistState && !this.userPaused) {
            this.setState("playing");
          } else if (!this.playlistState) {
            this.setState("ready");
          }
        }
        this.syncMediaSessionPlaybackState();
      });
      this.audio.addEventListener("play", () => {
        this.setState("playing");
        this.syncMediaSessionPlaybackState();
      });
      this.audio.addEventListener("pause", () => {
        if (this.state === "loading") return;
        if (this.userPaused) {
          this.setState("paused");
        } else if (!this.playlistState) {
          this.setState("ready");
        }
        this.syncMediaSessionPlaybackState();
      });
      this.audio.addEventListener("timeupdate", () => {
        const audio = this.audio;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        updateMediaSessionPositionState(audio.duration, audio.currentTime);
      });
      this.audio.addEventListener("error", () => {
        this.setState("error", "Playback failed");
        this.syncMediaSessionPlaybackState();
      });
      this.ensureMediaSessionHandlers();

      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
      }
    }
    return this.audio;
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    if (this.audioContext?.state === "suspended") {
      void this.audioContext.resume();
    }
    this.syncMediaSessionPlaybackState();
  };

  private ensureMediaSessionHandlers() {
    if (this.mediaSessionBound || typeof window === "undefined") return;
    this.mediaSessionBound = true;

    bindMediaSessionActions(
      {
        onPlay: () => this.resume(),
        onPause: () => this.pause(),
        onPrevious: () => this.previousTrack(),
        onNext: () => this.nextTrack(),
      },
      this.canSkipTracks()
    );
  }

  private refreshMediaSessionActions() {
    bindMediaSessionActions(
      {
        onPlay: () => this.resume(),
        onPause: () => this.pause(),
        onPrevious: () => this.previousTrack(),
        onNext: () => this.nextTrack(),
      },
      this.canSkipTracks()
    );
  }

  private syncMediaSessionPlaybackState() {
    if (!this.playlistState && this.state !== "playing" && this.state !== "paused") {
      updateMediaSessionPlaybackState("none");
      return;
    }

    if (this.userPaused || this.state === "paused") {
      updateMediaSessionPlaybackState("paused");
      return;
    }

    if (
      this.state === "playing" ||
      this.state === "loading" ||
      (this.playlistState && !this.userPaused)
    ) {
      updateMediaSessionPlaybackState("playing");
    }
  }

  private updateMediaSessionForRequest(request: TtsRequest) {
    const albumTitle =
      this.playlistState?.albumTitle ?? this._albumTitle ?? this._singleAlbumTitle;
    updateMediaSessionMetadata(request, albumTitle);
    this.refreshMediaSessionActions();
    this.syncMediaSessionPlaybackState();
  }

  private signalResume() {
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  private waitForResume(signal: AbortSignal): Promise<void> {
    if (!this.userPaused || signal.aborted) return Promise.resolve();

    return new Promise((resolve) => {
      const onResume = () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      };
      const onAbort = () => {
        const index = this.resumeWaiters.indexOf(onResume);
        if (index >= 0) this.resumeWaiters.splice(index, 1);
        resolve();
      };
      this.resumeWaiters.push(onResume);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  setLoop(enabled: boolean) {
    this.loopEnabled = enabled;
    if (this.audio) this.audio.loop = enabled;
  }

  stopPlaylist() {
    this.playlistAbort?.abort();
    this.playlistAbort = null;
    this.playlistLoopEnabled = false;
    this.userPaused = false;
    this.signalResume();
    this._albumTitle = undefined;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.setPlaylistState(null);
    this.setState("ready");
    clearMediaSession();
  }

  // ─── Jump to a specific playlist item ──────────────────────────────────────

  jumpToPlaylistItem(index: number) {
    if (!this.playlistState) return;
    const items = this.playlistState.items;
    if (index < 0 || index >= items.length) return;

    this.userPaused = false;
    this.signalResume();

    // Abort the current playlist loop and restart from the new index
    this.playlistAbort?.abort();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    const { pauseMs } = this.playlistState;
    const onItemChange = this._lastOnItemChange;
    const shadowPauseMs = this._lastShadowPauseMs;

    // Restart from target index
    const abort = new AbortController();
    this.playlistAbort = abort;

    void this._runPlaylist(
      items,
      pauseMs,
      onItemChange,
      shadowPauseMs,
      abort,
      index,
      this._lastOnSentencePlayed
    );
  }

  // ─── Stored playlist callback refs for jump support ──────────────────────

  private _lastOnItemChange?: (index: number) => void;
  private _lastShadowPauseMs = 0;
  private _lastOnSentencePlayed?: (sentenceId: string) => void;

  // ─── Text resolution ────────────────────────────────────────────────────────

  private resolveSpokenText(request: TtsRequest): string | null {
    return getSpokenScriptFromFields(request, {
      dialect: request.dialect ?? "standard",
      learnerName: request.learnerName,
      ttsSource: request.ttsSource ?? "surface",
      fishAudio: request.fishAudio,
      paralinguisticTags: request.paralinguisticTags,
    });
  }

  private revokeObjectUrl() {
    if (this.objectUrlToRevoke) {
      try {
        URL.revokeObjectURL(this.objectUrlToRevoke);
      } catch {
        // ignore
      }
      this.objectUrlToRevoke = null;
    }
  }

  /**
   * Online-first: local offline package → signed stream URL → legacy TTS POST.
   * Returns either a Blob (local/legacy) or a remote stream URL string.
   */
  async resolvePlaybackSource(
    request: TtsRequest
  ): Promise<{ kind: "blob"; blob: Blob } | { kind: "url"; url: string }> {
    const dialect = request.dialect ?? "standard";
    const speaker = request.speaker === "B" ? "B" : "A";
    const spokenText = this.resolveSpokenText(request);
    if (!spokenText) {
      throw new Error("Missing kana reading for pronunciation");
    }

    const textHash = await getTextHashAsync(
      request.sentenceId,
      spokenText,
      dialect,
      speaker,
      request.cacheBySpokenScript ? "spoken-script" : "sentence"
    );
    const force = request.forceRegenerate === true;

    if (!force) {
      const offlineExact = await getOfflineAsset(textHash);
      if (offlineExact?.blob) {
        return { kind: "blob", blob: offlineExact.blob };
      }

      const isOffline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        const offlineLegacy = await getOfflineAssetBySentenceId(
          request.sentenceId
        );
        if (offlineLegacy?.blob) {
          return { kind: "blob", blob: offlineLegacy.blob };
        }
      }

      const cached = await getCachedAudio(request.sentenceId);
      if (cached && cached.textHash === textHash) {
        return { kind: "blob", blob: cached.blob };
      }
      if (request.cacheBySpokenScript) {
        const sharedCached = await getCachedAudioByTextHash(textHash);
        if (sharedCached?.blob) {
          return { kind: "blob", blob: sharedCached.blob };
        }
      }
    } else {
      await deleteCachedAudio(request.sentenceId);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Audio not downloaded for offline playback");
    }

    if (ONLINE_FIRST_ENABLED) {
      const source = await this.resolveCloudStream(request, spokenText);
      if (source) return source;
    }

    // Legacy path: full POST /api/tts (also used when online-first resolve is unavailable)
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentenceId: request.sentenceId,
        japanese: request.japanese,
        reading: request.reading,
        phonetic_reading: request.phonetic_reading,
        placeholders: request.placeholders,
        learnerName: request.learnerName,
        dialect,
        speaker,
        register: request.register,
        tags: request.tags,
        context_notes: request.context_notes,
        english: request.english,
        fishAudio: request.fishAudio,
        paralinguisticTags: request.paralinguisticTags,
        cacheBySpokenScript: request.cacheBySpokenScript,
        ttsSource: request.ttsSource ?? "surface",
        force: force,
      }),
    });

    if (!response.ok) {
      if (response.status === 422) {
        throw new Error("This sentence needs a kana reading. Try retranslating it.");
      }
      if (response.status === 503) {
        return {
          kind: "blob",
          blob: await this.synthesizeWithWebSpeech(spokenText),
        };
      }
      throw new Error("Failed to fetch audio");
    }

    const blob = await response.blob();
    const serverHash = response.headers.get("X-Audio-Hash");
    const cacheHash = serverHash ?? textHash;
    await saveCachedAudio({
      sentenceId: request.sentenceId,
      textHash: cacheHash,
      blob,
      createdAt: new Date().toISOString(),
      dialect,
      speaker,
      byteSize: blob.size,
    });
    return { kind: "blob", blob };
  }

  private async resolveCloudStream(
    request: TtsRequest,
    spokenText: string
  ): Promise<{ kind: "url"; url: string } | null> {
    const dialect = request.dialect ?? "standard";
    const speaker = request.speaker === "B" ? "B" : "A";

    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch("/api/audio/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sentenceId: request.sentenceId,
          japanese: request.japanese,
          reading: request.reading,
          phonetic_reading: request.phonetic_reading,
          placeholders: request.placeholders,
          learnerName: request.learnerName,
          dialect,
          speaker,
          register: request.register,
          tags: request.tags,
          context_notes: request.context_notes,
          english: request.english,
          fishAudio: request.fishAudio,
          paralinguisticTags: request.paralinguisticTags,
          cacheBySpokenScript: request.cacheBySpokenScript,
        }),
      });

      if (response.status === 401 || response.status === 422) {
        return null;
      }

      if (!response.ok) {
        if (attempt === 3) return null;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }

      const data = (await response.json()) as {
        status: string;
        url?: string;
        streamPath?: string;
        message?: string;
      };

      if (data.status === "ready" && (data.url || data.streamPath)) {
        return { kind: "url", url: data.url || data.streamPath! };
      }

      if (data.status === "queued") {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
        continue;
      }
      break;
    }

    void spokenText;
    return null;
  }

  /** @deprecated Prefer resolvePlaybackSource — kept for callers expecting blobs. */
  async fetchAudioBlob(request: TtsRequest): Promise<Blob> {
    const source = await this.resolvePlaybackSource(request);
    if (source.kind === "blob") return source.blob;
    const res = await fetch(source.url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch streamed audio");
    return res.blob();
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

  async playSentence(
    request: TtsRequest,
    options?: { albumTitle?: string }
  ): Promise<void> {
    if (options?.albumTitle) {
      this._singleAlbumTitle = options.albumTitle;
    }

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
    this.updateMediaSessionForRequest(request);
    try {
      const audio = this.ensureAudio();
      this.revokeObjectUrl();
      const source = await this.resolvePlaybackSource(request);

      if (source.kind === "blob") {
        if (source.blob.size === 0) {
          await this.speakWebSpeech(spokenText);
          this.setState("ready");
          return;
        }
        const url = URL.createObjectURL(source.blob);
        this.objectUrlToRevoke = url;
        audio.src = url;
      } else {
        audio.src = source.url;
      }

      audio.loop = this.loopEnabled;
      audio.playbackRate = this._playbackRate;
      await audio.play();
    } catch (e) {
      try {
        await this.speakWebSpeech(spokenText);
        this.setState("ready");
      } catch {
        this.setState(
          "error",
          e instanceof Error
            ? e.message
            : ONLINE_FIRST_ENABLED
              ? "Audio is still being prepared. Try again shortly."
              : "Playback error"
        );
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
    this.userPaused = true;
    this.audio?.pause();
    if (this.playlistState || this.state === "playing" || this.state === "loading") {
      this.setState("paused");
    }
    this.syncMediaSessionPlaybackState();
  }

  resume() {
    this.userPaused = false;
    this.signalResume();
    if (this.audio?.paused && !this.audio.ended) {
      this.audio.playbackRate = this._playbackRate;
      void this.audio.play();
    }
    this.syncMediaSessionPlaybackState();
  }

  async playPlaylist(
    items: TtsRequest[],
    pauseMs = 1500,
    onItemChange?: (index: number) => void,
    shadowPauseMs = 0,
    options?: {
      onSentencePlayed?: (sentenceId: string) => void;
      loop?: boolean;
      albumTitle?: string;
    }
  ): Promise<void> {
    this._lastOnItemChange = onItemChange;
    this._lastShadowPauseMs = shadowPauseMs;
    this._lastOnSentencePlayed = options?.onSentencePlayed;
    this._albumTitle = options?.albumTitle;
    this.playlistLoopEnabled = options?.loop ?? false;
    this.userPaused = false;

    this.playlistAbort?.abort();
    const abort = new AbortController();
    this.playlistAbort = abort;

    await this._runPlaylist(
      items,
      pauseMs,
      onItemChange,
      shadowPauseMs,
      abort,
      0,
      options?.onSentencePlayed
    );
  }

  private async _runPlaylist(
    items: TtsRequest[],
    pauseMs: number,
    onItemChange: ((index: number) => void) | undefined,
    shadowPauseMs: number,
    abort: AbortController,
    startIndex: number,
    onSentencePlayed?: (sentenceId: string) => void
  ): Promise<void> {
    for (let i = startIndex; i < items.length; i++) {
      if (abort.signal.aborted) break;
      onItemChange?.(i);
      this.setPlaylistState({
        items,
        currentIndex: i,
        pauseMs,
        albumTitle: this._albumTitle,
      });
      this.refreshMediaSessionActions();
      onSentencePlayed?.(items[i].sentenceId);
      await this.playSentence(items[i]);

      await this.waitForAudioEnd(abort.signal);

      if (shadowPauseMs > 0) {
        await this.delay(shadowPauseMs, abort.signal);
      } else {
        const itemPause = items[i].pauseAfterMs;
        const waitMs =
          typeof itemPause === "number" && Number.isFinite(itemPause)
            ? itemPause
            : pauseMs;
        await this.delay(waitMs, abort.signal);
      }
    }

    if (!abort.signal.aborted && this.playlistLoopEnabled) {
      await this._runPlaylist(
        items,
        pauseMs,
        onItemChange,
        shadowPauseMs,
        abort,
        0,
        onSentencePlayed
      );
    } else if (!abort.signal.aborted) {
      this.setPlaylistState(null);
      clearMediaSession();
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

  private async delay(ms: number, signal: AbortSignal): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (signal.aborted) return;
      if (this.userPaused) {
        await this.waitForResume(signal);
        continue;
      }

      const remaining = end - Date.now();
      if (remaining <= 0) break;

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, Math.min(remaining, 200));
        signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true }
        );
      });
    }
  }
}

export const audioSession = new AudioSessionManager();
