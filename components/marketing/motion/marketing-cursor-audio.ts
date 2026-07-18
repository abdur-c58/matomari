/**
 * Shared marketing playback registry for the custom cursor progress rim.
 * Homepage-only — not wired into islands or the main audio session.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let current: HTMLAudioElement | null = null;
/** True when this module created the element and may destroy it. */
let owned = false;
let boundAudio: HTMLAudioElement | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function unbindCurrent() {
  if (!boundAudio) return;
  boundAudio.removeEventListener("timeupdate", onUpdate);
  boundAudio.removeEventListener("ended", onOwnedEnded);
  boundAudio.removeEventListener("pause", onOwnedPause);
  boundAudio.removeEventListener("play", onUpdate);
  boundAudio = null;
}

function onUpdate() {
  notify();
}

function onOwnedEnded() {
  if (!owned || !current) {
    notify();
    return;
  }
  clearOwned();
}

function onOwnedPause() {
  notify();
}

function clearOwned() {
  if (!current || !owned) return;
  const audio = current;
  unbindCurrent();
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  current = null;
  owned = false;
  notify();
}

function bindAudio(audio: HTMLAudioElement) {
  if (boundAudio === audio) return;
  unbindCurrent();
  boundAudio = audio;
  audio.addEventListener("timeupdate", onUpdate);
  audio.addEventListener("play", onUpdate);
  if (owned) {
    audio.addEventListener("ended", onOwnedEnded);
    audio.addEventListener("pause", onOwnedPause);
  }
}

export function subscribeMarketingCursorAudio(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMarketingCursorAudio(): HTMLAudioElement | null {
  return current;
}

/** 0–1 playback progress while audio is active. */
export function getMarketingCursorAudioProgress(): number {
  if (!current) return 0;
  const duration = current.duration;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, Math.max(0, current.currentTime / duration));
}

export function isMarketingCursorAudioPlaying(): boolean {
  return Boolean(current && !current.paused && !current.ended);
}

/**
 * Register an externally owned element (e.g. MarketingAudioGraph) for cursor progress.
 * Does not pause or destroy the element — call detach when playback stops.
 */
export function attachMarketingCursorAudio(audio: HTMLAudioElement) {
  if (current === audio && !owned) {
    bindAudio(audio);
    notify();
    return;
  }
  if (owned) clearOwned();
  else unbindCurrent();

  current = audio;
  owned = false;
  bindAudio(audio);
  notify();
}

/** Drop a previously attached external element from the cursor registry. */
export function detachMarketingCursorAudio(audio?: HTMLAudioElement) {
  if (!current || owned) return;
  if (audio && current !== audio) return;
  unbindCurrent();
  current = null;
  owned = false;
  notify();
}

export function playMarketingCursorAudio(src: string, fallbackText: string) {
  if (typeof window === "undefined") return;

  if (owned) clearOwned();
  else {
    unbindCurrent();
    current = null;
    owned = false;
  }

  const absolute = new URL(src, window.location.origin).href;
  const audio = new Audio(absolute);
  audio.preload = "auto";
  current = audio;
  owned = true;
  bindAudio(audio);
  notify();

  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(() => {
      if (current === audio) clearOwned();
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(fallbackText);
      utter.lang = "ja-JP";
      utter.rate = 0.92;
      const voices = window.speechSynthesis.getVoices();
      const japanese = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith("ja")
      );
      if (japanese) utter.voice = japanese;
      window.speechSynthesis.speak(utter);
    });
  }
}
