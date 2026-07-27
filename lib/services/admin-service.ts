import {
  fetchAuthUserAdmin,
  fetchSystemHealthAdmin,
  fetchUserUsageAdmin,
  listAdminAuditLogs,
  listAuthUsersDirectory,
  writeAdminAuditLog,
  type AdminActionType,
  type AdminAuditLogRow,
} from "@/lib/supabase/admin-data";
import {
  fetchProfileAdmin,
  listProfilesAdmin,
  type AppRole,
  type ProfileRow,
} from "@/lib/supabase/profiles-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/auth/require-staff";
import {
  BILLING_STATUS,
  type AdminUserDetail,
  type AdminUserListItem,
} from "@/lib/admin/types";
import {
  computeEffectiveTier,
  getUserSubscriptionAdmin,
  listSubscriptionsByUserIdsAdmin,
  upsertUserSubscriptionAdmin,
} from "@/lib/services/billing/subscription-service";
import { randomUUID } from "crypto";

export { BILLING_STATUS };
export type { AdminUserDetail, AdminUserListItem };

async function setProfileRoleAdmin(
  userId: string,
  role: AppRole
): Promise<ProfileRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("user_id, display_name, avatar_url, role, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.warn("setProfileRoleAdmin failed:", error?.message);
    return null;
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role ?? "user",
    updatedAt: data.updated_at,
  };
}

/**
 * Every mutating staff action must call this path so audit logging cannot be skipped.
 */
async function runStaffAction<T>(params: {
  actorUserId: string;
  actionType: AdminActionType;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
  execute: () => Promise<T>;
}): Promise<{ result: T; audit: AdminAuditLogRow | null }> {
  const result = await params.execute();
  const audit = await writeAdminAuditLog({
    actorUserId: params.actorUserId,
    actionType: params.actionType,
    targetUserId: params.targetUserId,
    details: params.details,
  });
  return { result, audit };
}

export async function listAdminUsers(params?: {
  search?: string;
  role?: AppRole;
}): Promise<AdminUserListItem[]> {
  const [profiles, authUsers] = await Promise.all([
    listProfilesAdmin({
      role: params?.role,
      search: params?.search,
      limit: 500,
    }),
    listAuthUsersDirectory(),
  ]);

  const authById = new Map(authUsers.map((u) => [u.userId, u]));
  const search = params?.search?.trim().toLowerCase();

  const profileIds = new Set(profiles.map((p) => p.userId));
  const missingAuth = authUsers.filter((u) => !profileIds.has(u.userId));

  const allIds = [
    ...profiles.map((p) => p.userId),
    ...missingAuth.map((u) => u.userId),
  ];
  const subsById = await listSubscriptionsByUserIdsAdmin(allIds);

  const merged: AdminUserListItem[] = profiles.map((profile) => {
    const auth = authById.get(profile.userId);
    const sub = subsById.get(profile.userId) ?? null;
    const effective = computeEffectiveTier(sub);
    return {
      userId: profile.userId,
      email: auth?.email ?? null,
      displayName: profile.displayName,
      role: profile.role,
      signupAt: auth?.createdAt ?? null,
      lastActiveAt: auth?.lastSignInAt ?? profile.updatedAt,
      subscriptionStatus: sub?.status ?? "none",
      subscriptionTier: sub?.tier ?? "free",
      effectiveTier: effective,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      profileUpdatedAt: profile.updatedAt,
    };
  });

  for (const auth of missingAuth) {
    const sub = subsById.get(auth.userId) ?? null;
    const effective = computeEffectiveTier(sub);
    merged.push({
      userId: auth.userId,
      email: auth.email,
      displayName: auth.email?.split("@")[0] ?? "User",
      role: "user",
      signupAt: auth.createdAt,
      lastActiveAt: auth.lastSignInAt,
      subscriptionStatus: sub?.status ?? "none",
      subscriptionTier: sub?.tier ?? "free",
      effectiveTier: effective,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      profileUpdatedAt: auth.createdAt ?? new Date(0).toISOString(),
    });
  }

  let filtered = merged;
  if (search) {
    filtered = merged.filter(
      (row) =>
        row.email?.toLowerCase().includes(search) ||
        row.displayName.toLowerCase().includes(search) ||
        row.userId.toLowerCase().includes(search)
    );
  }
  if (params?.role) {
    filtered = filtered.filter((row) => row.role === params.role);
  }

  filtered.sort((a, b) => {
    const aTime = a.signupAt ?? a.profileUpdatedAt;
    const bTime = b.signupAt ?? b.profileUpdatedAt;
    return bTime.localeCompare(aTime);
  });

  return filtered;
}

export async function getAdminUserDetail(
  userId: string
): Promise<AdminUserDetail | null> {
  const [profile, auth, usage, sub] = await Promise.all([
    fetchProfileAdmin(userId),
    fetchAuthUserAdmin(userId),
    fetchUserUsageAdmin(userId),
    getUserSubscriptionAdmin(userId),
  ]);

  if (!profile && !auth) return null;

  const effective = computeEffectiveTier(sub);

  return {
    userId,
    email: auth?.email ?? null,
    displayName: profile?.displayName ?? auth?.email?.split("@")[0] ?? "User",
    avatarUrl: profile?.avatarUrl ?? null,
    role: profile?.role ?? "user",
    signupAt: auth?.createdAt ?? null,
    lastActiveAt: usage.lastActiveAt ?? auth?.lastSignInAt ?? profile?.updatedAt ?? null,
    subscriptionStatus: sub?.status ?? "none",
    subscriptionTier: sub?.tier ?? "free",
    effectiveTier: effective,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    paddleCustomerId: sub?.paddleCustomerId ?? null,
    paddleSubscriptionId: sub?.paddleSubscriptionId ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    profileUpdatedAt: profile?.updatedAt ?? auth?.createdAt ?? new Date(0).toISOString(),
    usage,
  };
}

export async function changeUserRole(params: {
  actorUserId: string;
  actorRole: StaffRole;
  targetUserId: string;
  nextRole: AppRole;
}): Promise<
  | { ok: true; profile: ProfileRow; audit: AdminAuditLogRow | null }
  | { ok: false; error: string; status: number }
> {
  if (params.actorRole !== "admin") {
    return { ok: false, error: "Only admins can change roles", status: 403 };
  }
  if (params.targetUserId === params.actorUserId && params.nextRole !== "admin") {
    return {
      ok: false,
      error: "You cannot demote your own admin role",
      status: 400,
    };
  }

  const existing = await fetchProfileAdmin(params.targetUserId);
  const previousRole: AppRole = existing?.role ?? "user";
  if (previousRole === params.nextRole) {
    return {
      ok: false,
      error: `User already has role '${params.nextRole}'`,
      status: 400,
    };
  }

  // Ensure a profile row exists before role update.
  if (!existing) {
    const supabase = createAdminClient();
    if (!supabase) {
      return { ok: false, error: "Database unavailable", status: 503 };
    }
    const auth = await fetchAuthUserAdmin(params.targetUserId);
    await supabase.from("profiles").upsert(
      {
        user_id: params.targetUserId,
        display_name: auth?.email?.split("@")[0] ?? "Learner",
        avatar_url: null,
        role: "user",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  const { result: profile, audit } = await runStaffAction({
    actorUserId: params.actorUserId,
    actionType: "role_change",
    targetUserId: params.targetUserId,
    details: {
      previousRole,
      nextRole: params.nextRole,
    },
    execute: async () => setProfileRoleAdmin(params.targetUserId, params.nextRole),
  });

  if (!profile) {
    return { ok: false, error: "Failed to update role", status: 500 };
  }

  return { ok: true, profile, audit };
}

export async function applyAdminBillingAction(params: {
  actorUserId: string;
  actionType: Extract<
    AdminActionType,
    "comp_access" | "revoke_access" | "refund_issued" | "subscription_override"
  >;
  targetUserId: string;
  details?: Record<string, unknown>;
}): Promise<
  | { ok: true; subscription: Awaited<ReturnType<typeof getUserSubscriptionAdmin>>; audit: AdminAuditLogRow | null }
  | { ok: false; error: string; status: number; stubbed?: boolean; audit?: AdminAuditLogRow | null }
> {
  if (params.actionType === "refund_issued") {
    const { audit } = await runStaffAction({
      actorUserId: params.actorUserId,
      actionType: params.actionType,
      targetUserId: params.targetUserId,
      details: {
        ...params.details,
        stubbed: true,
        reason: "paddle_not_connected",
      },
      execute: async () => null,
    });
    return {
      ok: false,
      stubbed: true,
      error: "Refunds require Paddle Dashboard / API support — not implemented yet.",
      status: 501,
      audit,
    };
  }

  const existing = await getUserSubscriptionAdmin(params.targetUserId);
  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

  const { result: subscription, audit } = await runStaffAction({
    actorUserId: params.actorUserId,
    actionType: params.actionType,
    targetUserId: params.targetUserId,
    details: {
      previousTier: existing?.tier ?? "free",
      previousStatus: existing?.status ?? "active",
      ...params.details,
      simulation: false,
    },
    execute: async () => {
      if (params.actionType === "comp_access") {
        const compTier =
          params.details?.tier === "pro" ? "pro" : "plus";
        return upsertUserSubscriptionAdmin({
          userId: params.targetUserId,
          tier: compTier,
          status: "active",
          paddleCustomerId:
            existing?.paddleCustomerId ??
            `pad_cus_comp_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          paddleSubscriptionId: `pad_sub_comp_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
        });
      }
      if (params.actionType === "revoke_access") {
        return upsertUserSubscriptionAdmin({
          userId: params.targetUserId,
          tier: "free",
          status: "active",
          paddleCustomerId: existing?.paddleCustomerId ?? null,
          paddleSubscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
      // subscription_override — set tier from details.tier
      const nextTier =
        params.details?.tier === "pro" ||
        params.details?.tier === "plus" ||
        params.details?.tier === "free"
          ? params.details.tier
          : "plus";
      if (nextTier === "plus" || nextTier === "pro") {
        return upsertUserSubscriptionAdmin({
          userId: params.targetUserId,
          tier: nextTier,
          status: "active",
          paddleCustomerId:
            existing?.paddleCustomerId ??
            `pad_cus_ovr_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          paddleSubscriptionId: `pad_sub_ovr_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
        });
      }
      return upsertUserSubscriptionAdmin({
        userId: params.targetUserId,
        tier: "free",
        status: "active",
        paddleCustomerId: existing?.paddleCustomerId ?? null,
        paddleSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    },
  });

  if (!subscription) {
    return { ok: false, error: "Failed to update subscription", status: 500, audit };
  }
  return { ok: true, subscription, audit };
}

/** @deprecated Use applyAdminBillingAction — kept for any leftover imports */
export async function stubBillingAction(params: {
  actorUserId: string;
  actionType: Extract<
    AdminActionType,
    "comp_access" | "revoke_access" | "refund_issued" | "subscription_override"
  >;
  targetUserId: string;
  details?: Record<string, unknown>;
}) {
  return applyAdminBillingAction(params);
}

export async function getAdminSystemHealth() {
  const health = await fetchSystemHealthAdmin();
  return {
    ...health,
    billing: BILLING_STATUS,
  };
}

export async function getAdminActivityLog(params?: {
  actorUserId?: string;
  actionType?: AdminActionType;
  from?: string;
  to?: string;
}): Promise<AdminAuditLogRow[]> {
  return listAdminAuditLogs(params);
}
