import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRemoteLibraryAdmin } from "@/lib/supabase/server-sync";
import {
  getEntitlementCaps,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import {
  computeEffectiveTier,
  getUserSubscriptionAdmin,
  type UserSubscriptionRow,
} from "@/lib/services/billing/subscription-service";
import type { UserLibrary } from "@/types/sentence";

export type EntitlementErrorCode =
  | "scene_limit"
  | "sentence_limit"
  | "daily_generation_limit";

export class EntitlementError extends Error {
  constructor(
    public code: EntitlementErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export type EffectiveEntitlements = {
  subscription: UserSubscriptionRow | null;
  effectiveTier: SubscriptionTierId;
  caps: ReturnType<typeof getEntitlementCaps>;
};

export async function getEffectiveEntitlements(
  userId: string
): Promise<EffectiveEntitlements> {
  const subscription = await getUserSubscriptionAdmin(userId);
  const effectiveTier = computeEffectiveTier(subscription);
  return {
    subscription,
    effectiveTier,
    caps: getEntitlementCaps(effectiveTier),
  };
}

function countOwnedScenes(library: UserLibrary | null | undefined): number {
  if (!library?.scenes) return 0;
  return Object.keys(library.scenes).length;
}

function maxSentencesInLibrary(library: UserLibrary | null | undefined): number {
  if (!library?.scenes) return 0;
  let max = 0;
  for (const scene of Object.values(library.scenes)) {
    const n = Array.isArray(scene?.sentences) ? scene.sentences.length : 0;
    if (n > max) max = n;
  }
  return max;
}

/** Start of current UTC calendar day. */
export function utcDayStartIso(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

export async function countSceneGenerationsToday(
  userId: string
): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("ai_generation_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "scene")
    .gte("created_at", utcDayStartIso());

  if (error) {
    console.warn("countSceneGenerationsToday failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function recordSceneGeneration(userId: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("ai_generation_events").insert({
    user_id: userId,
    kind: "scene",
  });
  if (error) {
    console.warn("recordSceneGeneration failed:", error.message);
  }
}

export async function assertCanGenerateScene(
  userId: string,
  params: { targetSentenceCount: number }
): Promise<EffectiveEntitlements> {
  const entitlements = await getEffectiveEntitlements(userId);
  const { caps } = entitlements;

  if (params.targetSentenceCount > caps.maxSentencesPerScene) {
    throw new EntitlementError(
      "sentence_limit",
      `Your plan allows up to ${caps.maxSentencesPerScene} sentences per scene.`
    );
  }

  const remote = await fetchRemoteLibraryAdmin(userId);
  const library = remote?.data;
  const sceneCount = countOwnedScenes(library);
  if (sceneCount >= caps.maxScenes) {
    throw new EntitlementError(
      "scene_limit",
      `Your plan allows up to ${caps.maxScenes} scenes. Remove one before creating another.`
    );
  }

  const gensToday = await countSceneGenerationsToday(userId);
  if (gensToday >= caps.dailySceneGenerations) {
    throw new EntitlementError(
      "daily_generation_limit",
      `Daily AI scene generation limit reached (${caps.dailySceneGenerations}). Try again tomorrow.`
    );
  }

  return entitlements;
}

/** Validate a library payload before sync upsert (defense in depth). */
export function assertLibraryWithinEntitlements(
  library: unknown,
  caps: ReturnType<typeof getEntitlementCaps>
): void {
  const scenes =
    library && typeof library === "object"
      ? (library as UserLibrary).scenes
      : undefined;
  if (!scenes || typeof scenes !== "object") return;

  const keys = Object.keys(scenes);
  if (keys.length > caps.maxScenes) {
    throw new EntitlementError(
      "scene_limit",
      `Your plan allows up to ${caps.maxScenes} scenes (found ${keys.length}).`
    );
  }

  for (const [key, scene] of Object.entries(scenes)) {
    const n = Array.isArray(scene?.sentences) ? scene.sentences.length : 0;
    if (n > caps.maxSentencesPerScene) {
      throw new EntitlementError(
        "sentence_limit",
        `Scene "${key}" has ${n} sentences; your plan allows up to ${caps.maxSentencesPerScene}.`
      );
    }
  }
}

export function validateGeneratedSentenceCount(
  count: number,
  caps: ReturnType<typeof getEntitlementCaps>
): void {
  if (count > caps.maxSentencesPerScene) {
    throw new EntitlementError(
      "sentence_limit",
      `Generated scene has ${count} sentences; your plan allows up to ${caps.maxSentencesPerScene}.`
    );
  }
}

export { maxSentencesInLibrary, countOwnedScenes };
