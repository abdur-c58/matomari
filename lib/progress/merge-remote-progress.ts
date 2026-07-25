import type { UserProgress } from "@/types/progress";

/**
 * Merge remote progress snapshot into local, preserving:
 * - Local browse/playlist UI choices (device-specific preferences)
 * - onboardingCompleted: true once set locally — a stale remote pull must
 *   never downgrade it back to false (guards against the push-not-flushed
 *   race that re-triggers the overlay on re-entry to the dashboard).
 */
export function mergeRemoteProgressPreservingLocalUi(
  remote: UserProgress,
  local: UserProgress
): UserProgress {
  // Once onboarding is locally marked complete, keep it complete even if the
  // remote snapshot hasn't received the push yet.
  const onboardingCompleted =
    local.settings.onboardingCompleted === true
      ? true
      : remote.settings.onboardingCompleted;

  const onboardingCompletedAt =
    local.settings.onboardingCompleted === true
      ? (local.settings.onboardingCompletedAt ?? remote.settings.onboardingCompletedAt)
      : remote.settings.onboardingCompletedAt;

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
      onboardingCompleted,
      ...(onboardingCompletedAt ? { onboardingCompletedAt } : {}),
    },
  };
}
