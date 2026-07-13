import type { TtsRequest } from "@/lib/audio/audio-session";

export type MediaSessionHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

function getSentenceTitle(item: TtsRequest): string {
  return item.japanese?.trim() || item.english?.trim() || "Sentence";
}

export function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

export function bindMediaSessionActions(
  handlers: MediaSessionHandlers,
  canSkip: boolean
): void {
  if (!isMediaSessionSupported()) return;

  try {
    navigator.mediaSession.setActionHandler("play", handlers.onPlay);
    navigator.mediaSession.setActionHandler("pause", handlers.onPause);
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      canSkip ? handlers.onPrevious : null
    );
    navigator.mediaSession.setActionHandler("nexttrack", canSkip ? handlers.onNext : null);
  } catch {
    // Some browsers reject handlers until playback starts.
  }
}

export function updateMediaSessionMetadata(
  item: TtsRequest,
  albumTitle?: string
): void {
  if (!isMediaSessionSupported()) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: getSentenceTitle(item),
    album: albumTitle?.trim() || "Kotoshima",
    artist: "Kotoshima",
    artwork: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
}

export function updateMediaSessionPlaybackState(
  state: "playing" | "paused" | "none"
): void {
  if (!isMediaSessionSupported()) return;

  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    // Unsupported on some browsers.
  }
}

export function updateMediaSessionPositionState(
  duration: number,
  position: number
): void {
  if (!isMediaSessionSupported() || !("setPositionState" in navigator.mediaSession)) {
    return;
  }

  if (!Number.isFinite(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: 1,
      position: Math.min(Math.max(position, 0), duration),
    });
  } catch {
    // Position updates can fail while metadata is changing.
  }
}

export function clearMediaSession(): void {
  if (!isMediaSessionSupported()) return;

  navigator.mediaSession.metadata = null;
  updateMediaSessionPlaybackState("none");

  for (const action of ["play", "pause", "previoustrack", "nexttrack"] as const) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // Ignore unsupported actions.
    }
  }
}
