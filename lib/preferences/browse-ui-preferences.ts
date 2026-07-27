import {
  DEFAULT_SCENE_BROWSE_DISPLAY,
  type SceneBrowseDisplay,
} from "@/lib/constants/scene-browse";

const STORAGE_KEY = "language:browse-ui-v1";

const DEFAULT_CASUAL_PAUSE_MS = 1200;
const DEFAULT_CASUAL_PLAYBACK_RATE = 1;

export type BrowseUiPreferences = {
  sceneBrowseDisplay: SceneBrowseDisplay;
  casualPlaylistPauseMs: number;
  casualPlaylistPlaybackRate: number;
};

function withDefaults(
  partial?: Partial<BrowseUiPreferences>
): BrowseUiPreferences {
  return {
    sceneBrowseDisplay:
      partial?.sceneBrowseDisplay ?? DEFAULT_SCENE_BROWSE_DISPLAY,
    casualPlaylistPauseMs:
      partial?.casualPlaylistPauseMs ?? DEFAULT_CASUAL_PAUSE_MS,
    casualPlaylistPlaybackRate:
      partial?.casualPlaylistPlaybackRate ?? DEFAULT_CASUAL_PLAYBACK_RATE,
  };
}

export function readBrowseUiPreferences(
  seed?: Partial<BrowseUiPreferences>
): BrowseUiPreferences {
  const defaults = withDefaults(seed);

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<BrowseUiPreferences>;
    return withDefaults({ ...defaults, ...parsed });
  } catch {
    return defaults;
  }
}

export function writeBrowseUiPreferences(prefs: BrowseUiPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function patchBrowseUiPreferences(
  patch: Partial<BrowseUiPreferences>,
  seed?: Partial<BrowseUiPreferences>
): BrowseUiPreferences {
  const next = { ...readBrowseUiPreferences(seed), ...patch };
  writeBrowseUiPreferences(next);
  return next;
}
