import { createAdminClient } from "@/lib/supabase/admin";
import {
  ENTITLEMENTS,
  getEntitlementCaps,
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import { resolveFreeUnlockedSceneKeys } from "@/lib/services/scene-access-service";
import { fetchRemoteLibraryAdmin } from "@/lib/supabase/server-sync";
import { fetchRemoteProgressAdmin } from "@/lib/supabase/server-sync";

export type SubscriptionStatus = "active" | "canceled" | "past_due";

export type UserSubscriptionRow = {
  userId: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** @deprecated Prefer unlockedSceneKeys — kept for API compatibility. */
  freeUnlockedSceneKeys: string[];
  unlockedSceneKeys: string[];
  updatedAt: string;
};

function mapRow(data: {
  user_id: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  free_unlocked_scene_keys?: string[] | null;
  unlocked_scene_keys?: string[] | null;
  updated_at: string;
}): UserSubscriptionRow {
  const unlocked =
    data.unlocked_scene_keys ?? data.free_unlocked_scene_keys ?? [];
  return {
    userId: data.user_id,
    tier: data.tier,
    status: data.status,
    paddleCustomerId: data.paddle_customer_id,
    paddleSubscriptionId: data.paddle_subscription_id,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    freeUnlockedSceneKeys: unlocked,
    unlockedSceneKeys: unlocked,
    updatedAt: data.updated_at,
  };
}

const SELECT_COLS_FULL =
  "user_id, tier, status, paddle_customer_id, paddle_subscription_id, current_period_end, cancel_at_period_end, free_unlocked_scene_keys, unlocked_scene_keys, updated_at";

const SELECT_COLS_LEGACY =
  "user_id, tier, status, paddle_customer_id, paddle_subscription_id, current_period_end, cancel_at_period_end, free_unlocked_scene_keys, updated_at";

async function selectSubscription(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string
) {
  const full = await supabase
    .from("user_subscriptions")
    .select(SELECT_COLS_FULL)
    .eq("user_id", userId)
    .maybeSingle();
  if (!full.error) return full;
  return supabase
    .from("user_subscriptions")
    .select(SELECT_COLS_LEGACY)
    .eq("user_id", userId)
    .maybeSingle();
}

/** Lazy period-end downgrade for canceled-at-period-end Plus/Pro. */
export function computeEffectiveTier(
  sub: UserSubscriptionRow | null
): SubscriptionTierId {
  if (!sub || !hasMinTier(sub.tier, "plus")) return "free";
  if (sub.status === "active" || sub.status === "past_due") return sub.tier;
  if (
    sub.status === "canceled" &&
    sub.cancelAtPeriodEnd &&
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd).getTime() > Date.now()
  ) {
    return sub.tier;
  }
  return "free";
}

export async function ensureUserSubscriptionAdmin(
  userId: string
): Promise<UserSubscriptionRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data: existing } = await selectSubscription(supabase, userId);

  if (existing) return mapRow(existing);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        tier: "free",
        status: "active",
        cancel_at_period_end: false,
        free_unlocked_scene_keys: [],
        unlocked_scene_keys: [],
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select(SELECT_COLS_FULL)
    .maybeSingle();

  if (error || !data) {
    // Legacy schema without unlocked_scene_keys
    const legacy = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: userId,
          tier: "free",
          status: "active",
          cancel_at_period_end: false,
          free_unlocked_scene_keys: [],
          updated_at: now,
        },
        { onConflict: "user_id" }
      )
      .select(SELECT_COLS_LEGACY)
      .maybeSingle();
    if (legacy.error || !legacy.data) {
      console.warn("ensureUserSubscriptionAdmin failed:", error?.message ?? legacy.error?.message);
      return null;
    }
    return mapRow(legacy.data);
  }
  return mapRow(data);
}

/**
 * After paid → Free: pick up to Free.maxScenes unlocked custom scenes.
 */
export async function finalizeDowngradeToFree(
  userId: string
): Promise<UserSubscriptionRow | null> {
  return finalizeDowngradeToTier(userId, "free");
}

/** Downgrade to Free or Plus with grandfathered unlocked slots. */
export async function finalizeDowngradeToTier(
  userId: string,
  targetTier: "free" | "plus"
): Promise<UserSubscriptionRow | null> {
  const [library, progress] = await Promise.all([
    fetchRemoteLibraryAdmin(userId),
    fetchRemoteProgressAdmin(userId),
  ]);
  const ownedKeys = Object.keys(library?.data?.scenes ?? {});
  const max = ENTITLEMENTS[targetTier].maxScenes;
  const unlocked = resolveFreeUnlockedSceneKeys({
    ownedKeys,
    lastOpened: progress?.data?.studyUnitLastOpened ?? null,
    storedKeys: [],
    max,
  });

  return upsertUserSubscriptionAdmin({
    userId,
    tier: targetTier,
    status: "active",
    paddleCustomerId: undefined,
    paddleSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    unlockedSceneKeys: unlocked,
    preserveCustomerId: true,
  });
}

/**
 * Read subscription and apply lazy period-end downgrade when needed.
 */
export async function getUserSubscriptionAdmin(
  userId: string
): Promise<UserSubscriptionRow | null> {
  let sub = await ensureUserSubscriptionAdmin(userId);
  if (!sub) return null;

  const effective = computeEffectiveTier(sub);
  if (
    hasMinTier(sub.tier, "plus") &&
    sub.status === "canceled" &&
    sub.cancelAtPeriodEnd &&
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd).getTime() <= Date.now() &&
    effective === "free"
  ) {
    sub = (await finalizeDowngradeToFree(userId)) ?? sub;
  }

  return sub;
}

export async function upsertUserSubscriptionAdmin(params: {
  userId: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  paddleCustomerId?: string | null;
  paddleSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  freeUnlockedSceneKeys?: string[] | null;
  unlockedSceneKeys?: string[] | null;
  /** When true, keep existing paddle_customer_id if param omitted. */
  preserveCustomerId?: boolean;
}): Promise<UserSubscriptionRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const existing = params.preserveCustomerId
    ? await ensureUserSubscriptionAdmin(params.userId)
    : null;

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: params.userId,
    tier: params.tier,
    status: params.status,
    paddle_subscription_id: params.paddleSubscriptionId ?? null,
    current_period_end: params.currentPeriodEnd ?? null,
    cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
    updated_at: now,
  };

  if (params.paddleCustomerId !== undefined) {
    row.paddle_customer_id = params.paddleCustomerId;
  } else if (params.preserveCustomerId && existing?.paddleCustomerId) {
    row.paddle_customer_id = existing.paddleCustomerId;
  } else if (params.paddleCustomerId === null) {
    row.paddle_customer_id = null;
  }

  const unlockedParam =
    params.unlockedSceneKeys ?? params.freeUnlockedSceneKeys;

  if (hasMinTier(params.tier, "plus")) {
    row.free_unlocked_scene_keys = [];
    row.unlocked_scene_keys = [];
  } else if (unlockedParam !== undefined) {
    const keys = unlockedParam ?? [];
    row.free_unlocked_scene_keys = keys;
    row.unlocked_scene_keys = keys;
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert(row, { onConflict: "user_id" })
    .select(SELECT_COLS_FULL)
    .maybeSingle();

  if (!error && data) return mapRow(data);

  // Drop unlocked_scene_keys for legacy DBs.
  delete row.unlocked_scene_keys;
  const legacy = await supabase
    .from("user_subscriptions")
    .upsert(row, { onConflict: "user_id" })
    .select(SELECT_COLS_LEGACY)
    .maybeSingle();

  if (legacy.error || !legacy.data) {
    console.warn(
      "upsertUserSubscriptionAdmin failed:",
      error?.message ?? legacy.error?.message
    );
    return null;
  }
  return mapRow(legacy.data);
}

export async function listSubscriptionsByUserIdsAdmin(
  userIds: string[]
): Promise<Map<string, UserSubscriptionRow>> {
  const map = new Map<string, UserSubscriptionRow>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const supabase = createAdminClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(SELECT_COLS_FULL)
    .in("user_id", unique);

  if (error) {
    const legacy = await supabase
      .from("user_subscriptions")
      .select(SELECT_COLS_LEGACY)
      .in("user_id", unique);
    if (legacy.error || !legacy.data) return map;
    for (const row of legacy.data) {
      map.set(row.user_id, mapRow(row));
    }
    return map;
  }
  if (!data) return map;
  for (const row of data) {
    map.set(row.user_id, mapRow(row));
  }
  return map;
}

export function capsForSubscription(
  sub: UserSubscriptionRow | null
): ReturnType<typeof getEntitlementCaps> {
  return getEntitlementCaps(computeEffectiveTier(sub));
}

export { ENTITLEMENTS, getEntitlementCaps };
