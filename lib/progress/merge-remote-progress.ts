import type { UserProgress } from "@/types/progress";

/** Keep local browse/playlist UI choices when applying a remote progress snapshot. */
export function mergeRemoteProgressPreservingLocalUi(
  remote: UserProgress,
  local: UserProgress
): UserProgress {
  return {
    ...remote,
    settings: {
      ...remote.settings,
      islandBrowseDisplay:
        local.settings.islandBrowseDisplay ?? remote.settings.islandBrowseDisplay,
      casualPlaylistPauseMs:
        local.settings.casualPlaylistPauseMs ?? remote.settings.casualPlaylistPauseMs,
      casualPlaylistPlaybackRate:
        local.settings.casualPlaylistPlaybackRate ??
        remote.settings.casualPlaylistPlaybackRate,
    },
  };
}
