import {
  ENTITLEMENTS,
  FREE_TRY_PREMADE_KEY,
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import type { Scene } from "@/types/sentence";

function isPremadeKey(sceneKey: string): boolean {
  return sceneKey.startsWith("premade_");
}

export type SceneAccessReason =
  | "ok"
  | "plus_required_premade"
  | "plus_required_locked_slot"
  | "plus_required_oversized"
  | "plus_required_narration";

export type SceneAccessResult = {
  accessible: boolean;
  reason: SceneAccessReason;
};

/** Featured 300 Essentials (and similar) locked for Free. */
export function isFeaturedPremadeLockedForFree(
  sceneKey: string,
  scene?: Scene | null
): boolean {
  if (scene?.featured) return true;
  if (/^premade_300_/i.test(sceneKey)) return true;
  return false;
}

export function isFreeTryPremade(sceneKey: string): boolean {
  return sceneKey === FREE_TRY_PREMADE_KEY;
}

/**
 * Pick up to `max` unlocked keys: prefer stored intersection with owned,
 * then most recently opened, then remaining owned keys.
 */
export function resolveFreeUnlockedSceneKeys(params: {
  ownedKeys: string[];
  lastOpened?: Record<string, string> | null;
  storedKeys?: string[] | null;
  max?: number;
}): string[] {
  const max = params.max ?? ENTITLEMENTS.free.maxScenes;
  const owned = new Set(params.ownedKeys);
  const result: string[] = [];

  const push = (key: string) => {
    if (!owned.has(key) || result.includes(key) || result.length >= max) return;
    result.push(key);
  };

  for (const key of params.storedKeys ?? []) push(key);

  const opened = Object.entries(params.lastOpened ?? {})
    .map(([unitKey, at]) => {
      const sceneKey = unitKey.startsWith("scene:")
        ? unitKey.slice("scene:".length)
        : unitKey.includes(":")
          ? unitKey.split(":").slice(1).join(":")
          : unitKey;
      return { sceneKey, at: new Date(at).getTime() };
    })
    .filter((e) => owned.has(e.sceneKey))
    .sort((a, b) => b.at - a.at);

  for (const { sceneKey } of opened) push(sceneKey);
  for (const key of params.ownedKeys) push(key);

  return result;
}

export function getSceneAccess(params: {
  effectiveTier: SubscriptionTierId;
  sceneKey: string;
  scene?: Scene | null;
  ownedKeys: string[];
  unlockedKeys: string[];
}): SceneAccessResult {
  // Plus and Pro: full library access (oversized only matters on Free).
  if (hasMinTier(params.effectiveTier, "plus")) {
    return { accessible: true, reason: "ok" };
  }

  const premade = isPremadeKey(params.sceneKey);
  if (premade) {
    if (isFeaturedPremadeLockedForFree(params.sceneKey, params.scene)) {
      return { accessible: false, reason: "plus_required_premade" };
    }
    if (isFreeTryPremade(params.sceneKey)) {
      return { accessible: true, reason: "ok" };
    }
    return { accessible: false, reason: "plus_required_premade" };
  }

  const sentenceCount = Array.isArray(params.scene?.sentences)
    ? params.scene!.sentences.length
    : 0;
  if (sentenceCount > ENTITLEMENTS.free.maxSentencesPerScene) {
    return { accessible: false, reason: "plus_required_oversized" };
  }

  if (!params.unlockedKeys.includes(params.sceneKey)) {
    if (
      params.ownedKeys.length <= ENTITLEMENTS.free.maxScenes &&
      params.ownedKeys.includes(params.sceneKey) &&
      params.unlockedKeys.length === 0
    ) {
      return { accessible: true, reason: "ok" };
    }
    if (params.unlockedKeys.length > 0) {
      return { accessible: false, reason: "plus_required_locked_slot" };
    }
  }

  if (params.unlockedKeys.includes(params.sceneKey)) {
    return { accessible: true, reason: "ok" };
  }

  if (
    params.ownedKeys.includes(params.sceneKey) &&
    params.ownedKeys.length <= ENTITLEMENTS.free.maxScenes
  ) {
    return { accessible: true, reason: "ok" };
  }

  return { accessible: false, reason: "plus_required_locked_slot" };
}

export function accessLockMessage(reason: SceneAccessReason): string {
  switch (reason) {
    case "plus_required_premade":
      return "Upgrade to Plus to access this premade scene.";
    case "plus_required_locked_slot":
      return "Upgrade to Plus to unlock this scene, or delete another to free a Free slot.";
    case "plus_required_oversized":
      return "This scene has more than 20 sentences. Upgrade to Plus to study it.";
    case "plus_required_narration":
      return "Narration scenes require Plus.";
    default:
      return "Upgrade to Plus to access this.";
  }
}
