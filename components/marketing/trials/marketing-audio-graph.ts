"use client";

import {
  attachMarketingCursorAudio,
  detachMarketingCursorAudio,
} from "@/components/marketing/motion/marketing-cursor-audio";

/**
 * Reusable Web Audio graph for marketing demos.
 * One MediaElementSource per HTMLAudioElement (browser constraint).
 *
 * Keeps desktop background playback alive: AudioContext is often suspended
 * when the tab is hidden, which would otherwise silence MediaElementSource
 * output while the user multitasks.
 */
export class MarketingAudioGraph {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audio: HTMLAudioElement | null = null;
  private playGeneration = 0;
  private intendedPlaying = false;
  private sessionTitle = "Matomari";
  private keepAliveBound = false;
  private ctxStateBound = false;

  getAnalyser() {
    return this.analyser;
  }

  getAudio() {
    return this.audio;
  }

  ensureAudio() {
    if (typeof window === "undefined") return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.crossOrigin = "anonymous";
    }
    return this.audio;
  }

  private bindKeepAlive() {
    if (this.keepAliveBound || typeof document === "undefined") return;
    this.keepAliveBound = true;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("focus", this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (!this.intendedPlaying) return;
    // Only resume when returning to the tab — do not fight intentional pauses.
    if (document.visibilityState !== "visible") return;
    void this.keepPlaying();
  };

  private bindContextState(ctx: AudioContext) {
    if (this.ctxStateBound) return;
    this.ctxStateBound = true;
    ctx.addEventListener("statechange", () => {
      if (!this.intendedPlaying) return;
      if (ctx.state === "suspended") {
        void this.keepPlaying();
      }
    });
  }

  private async keepPlaying() {
    if (!this.intendedPlaying) return;

    const audio = this.audio;
    // Natural clip end also leaves the element paused — never restart it here.
    if (audio?.ended) return;

    if (this.ctx?.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Ignore resume failures while backgrounded.
      }
    }

    if (!audio || !this.intendedPlaying || audio.ended) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // Autoplay policies may still block; user gesture already started playback.
      }
    }
  }

  private syncMediaSession(playing: boolean) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      if (playing) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.sessionTitle,
          artist: "Matomari",
          album: "Practice",
          artwork: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        });
        navigator.mediaSession.playbackState = "playing";
        navigator.mediaSession.setActionHandler("play", () => {
          void this.keepPlaying();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          this.stop();
        });
      } else {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
      }
    } catch {
      // Media Session is best-effort for background continuity.
    }
  }

  async ensureGraph() {
    const audio = this.ensureAudio();
    if (!audio) return null;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) this.ctx = new AudioCtx();
    this.bindContextState(this.ctx);
    this.bindKeepAlive();

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
      this.analyser.minDecibels = -78;
      this.analyser.maxDecibels = -18;
    }

    if (!this.source) {
      this.source = this.ctx.createMediaElementSource(audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    return this.analyser;
  }

  async play(src: string, rate = 1, options?: { title?: string }) {
    const audio = this.ensureAudio();
    if (!audio) throw new Error("Audio unavailable");

    await this.ensureGraph();

    const generation = ++this.playGeneration;
    this.sessionTitle = options?.title?.trim() || "Matomari";

    // Pause without keep-alive treating it as a background interrupt.
    this.intendedPlaying = false;
    audio.pause();

    const absolute = new URL(src, window.location.href).href;
    if (audio.src !== absolute) {
      audio.src = src;
      audio.load();
    }
    audio.playbackRate = rate;
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore if not seekable yet.
    }

    this.intendedPlaying = true;
    this.syncMediaSession(true);
    attachMarketingCursorAudio(audio);

    try {
      await this.keepPlaying();
      if (generation !== this.playGeneration) {
        throw new DOMException("Playback aborted", "AbortError");
      }
      if (audio.paused) {
        await audio.play();
      }

      await new Promise<void>((resolve, reject) => {
        const onEnded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Audio playback failed"));
        };
        const onPause = () => {
          // stop()/new play bumps generation — treat as abort.
          if (generation !== this.playGeneration) {
            cleanup();
            resolve();
            return;
          }
          // Browsers fire `pause` before `ended` when a clip finishes.
          // Never call keepPlaying here — that was restarting the clip.
          if (audio.ended) return;
          const nearEnd =
            Number.isFinite(audio.duration) &&
            audio.duration > 0 &&
            audio.currentTime >= audio.duration - 0.08;
          if (nearEnd) return;
        };
        const cleanup = () => {
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
          audio.removeEventListener("pause", onPause);
        };
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);
        audio.addEventListener("pause", onPause);
      });

      if (generation !== this.playGeneration) {
        throw new DOMException("Playback aborted", "AbortError");
      }
    } finally {
      if (this.playGeneration === generation) {
        this.intendedPlaying = false;
        this.syncMediaSession(false);
        detachMarketingCursorAudio(audio);
      }
    }
  }

  stop() {
    this.playGeneration += 1;
    this.intendedPlaying = false;
    this.syncMediaSession(false);
    const audio = this.audio;
    if (audio) detachMarketingCursorAudio(audio);
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore if not seekable yet.
    }
  }

  dispose() {
    this.stop();
    if (this.keepAliveBound && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("focus", this.handleVisibilityChange);
      this.keepAliveBound = false;
    }
    if (this.audio) {
      detachMarketingCursorAudio(this.audio);
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this.source = null;
    this.analyser = null;
    this.ctxStateBound = false;
    void this.ctx?.close();
    this.ctx = null;
  }
}
