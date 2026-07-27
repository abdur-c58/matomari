"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/providers/app-provider";
import {
  ENTITLEMENTS,
  FREE_TRY_PREMADE_KEY,
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import {
  accessLockMessage,
  getSceneAccess,
  resolveFreeUnlockedSceneKeys,
  type SceneAccessResult,
} from "@/lib/services/scene-access-service";
import { filterUserScenes } from "@/lib/services/shared-premade-service";

type SubPayload = {
  effectiveTier: SubscriptionTierId;
  subscription: {
    freeUnlockedSceneKeys?: string[];
    unlockedSceneKeys?: string[];
  } | null;
};

export function useSceneAccess() {
  const { status } = useSession();
  const { dataset, progress } = useApp();
  const [effectiveTier, setEffectiveTier] =
    useState<SubscriptionTierId>("free");
  const [storedUnlocked, setStoredUnlocked] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setEffectiveTier("free");
      setStoredUnlocked([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/billing/subscription")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as SubPayload;
        if (cancelled) return;
        setEffectiveTier(data.effectiveTier ?? "free");
        setStoredUnlocked(
          data.subscription?.unlockedSceneKeys ??
            data.subscription?.freeUnlockedSceneKeys ??
            []
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const ownedKeys = useMemo(() => {
    if (!dataset) return [] as string[];
    const premadeKeys = new Set(
      Object.keys(dataset.scenes ?? {}).filter((k) => k.startsWith("premade_"))
    );
    return Object.keys(filterUserScenes(dataset.scenes ?? {}, premadeKeys));
  }, [dataset]);

  const unlockedKeys = useMemo(() => {
    if (hasMinTier(effectiveTier, "plus")) return ownedKeys;
    return resolveFreeUnlockedSceneKeys({
      ownedKeys,
      lastOpened: progress.studyUnitLastOpened,
      storedKeys: storedUnlocked,
      max: ENTITLEMENTS.free.maxScenes,
    });
  }, [effectiveTier, ownedKeys, progress.studyUnitLastOpened, storedUnlocked]);

  const checkAccess = useCallback(
    (sceneKey: string): SceneAccessResult => {
      const scene = dataset?.scenes?.[sceneKey] ?? null;
      return getSceneAccess({
        effectiveTier,
        sceneKey,
        scene,
        ownedKeys,
        unlockedKeys,
      });
    },
    [dataset, effectiveTier, ownedKeys, unlockedKeys]
  );

  const caps = ENTITLEMENTS[effectiveTier];

  return {
    loaded,
    effectiveTier,
    unlockedKeys,
    ownedKeys,
    checkAccess,
    freeTryPremadeKey: FREE_TRY_PREMADE_KEY,
    allowsNarrationCreate: caps.allowsNarrationCreate,
    allowsOfflinePackages: caps.allowsOfflinePackages,
    allowsDeeperProgress: caps.allowsDeeperProgress,
    allowsVoiceSelection: caps.allowsVoiceSelection,
    allowsSceneExport: caps.allowsSceneExport,
    maxSentences: caps.maxSentencesPerScene,
    maxScenes: caps.maxScenes,
    lockMessage: accessLockMessage,
  };
}
