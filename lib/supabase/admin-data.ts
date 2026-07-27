import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/supabase/profiles-data";

export type AdminActionType =
  | "role_change"
  | "comp_access"
  | "revoke_access"
  | "refund_issued"
  | "subscription_override";

export type AdminAuditLogRow = {
  id: string;
  actorUserId: string;
  actionType: AdminActionType;
  targetUserId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

/**
 * Shared audit writer — all staff mutations must go through this helper
 * (via admin-service actions), not ad-hoc inserts.
 */
export async function writeAdminAuditLog(params: {
  actorUserId: string;
  actionType: AdminActionType;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
}): Promise<AdminAuditLogRow | null> {
  const supabase = createAdminClient();
  if (!supabase) {
    console.warn("writeAdminAuditLog: admin client unavailable");
    return null;
  }

  const { data, error } = await supabase
    .from("admin_audit_log")
    .insert({
      actor_user_id: params.actorUserId,
      action_type: params.actionType,
      target_user_id: params.targetUserId ?? null,
      details: params.details ?? {},
    })
    .select("id, actor_user_id, action_type, target_user_id, details, created_at")
    .maybeSingle();

  if (error || !data) {
    console.warn("writeAdminAuditLog failed:", error?.message);
    return null;
  }

  return {
    id: data.id,
    actorUserId: data.actor_user_id,
    actionType: data.action_type,
    targetUserId: data.target_user_id,
    details: (data.details ?? {}) as Record<string, unknown>,
    createdAt: data.created_at,
  };
}

export async function listAdminAuditLogs(params?: {
  actorUserId?: string;
  actionType?: AdminActionType;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AdminAuditLogRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("admin_audit_log")
    .select("id, actor_user_id, action_type, target_user_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 200);

  if (params?.actorUserId) {
    query = query.eq("actor_user_id", params.actorUserId);
  }
  if (params?.actionType) {
    query = query.eq("action_type", params.actionType);
  }
  if (params?.from) {
    query = query.gte("created_at", params.from);
  }
  if (params?.to) {
    query = query.lte("created_at", params.to);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.warn("listAdminAuditLogs failed:", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actionType: row.action_type as AdminActionType,
    targetUserId: row.target_user_id,
    details: (row.details ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export type AuthUserDirectoryRow = {
  userId: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

/** Paginate through Auth Admin API to build an email directory. */
export async function listAuthUsersDirectory(): Promise<AuthUserDirectoryRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const rows: AuthUserDirectoryRow[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("listAuthUsersDirectory failed:", error.message);
      break;
    }
    const users = data.users ?? [];
    for (const user of users) {
      rows.push({
        userId: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return rows;
}

export async function fetchAuthUserAdmin(
  userId: string
): Promise<AuthUserDirectoryRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    createdAt: data.user.created_at ?? null,
    lastSignInAt: data.user.last_sign_in_at ?? null,
  };
}

export type UserUsageSnapshot = {
  sceneCount: number;
  sentenceCount: number;
  storageBytes: number | null;
  lastActiveAt: string | null;
  datasetUpdatedAt: string | null;
  progressUpdatedAt: string | null;
  statsUpdatedAt: string | null;
};

function countLibraryUsage(data: unknown): { sceneCount: number; sentenceCount: number } {
  if (!data || typeof data !== "object") {
    return { sceneCount: 0, sentenceCount: 0 };
  }
  const scenes = (data as { scenes?: Record<string, { sentences?: unknown[] }> }).scenes;
  if (!scenes || typeof scenes !== "object") {
    return { sceneCount: 0, sentenceCount: 0 };
  }
  const sceneEntries = Object.values(scenes);
  let sentenceCount = 0;
  for (const scene of sceneEntries) {
    if (scene && typeof scene === "object" && Array.isArray(scene.sentences)) {
      sentenceCount += scene.sentences.length;
    }
  }
  return { sceneCount: sceneEntries.length, sentenceCount };
}

export async function fetchUserUsageAdmin(userId: string): Promise<UserUsageSnapshot> {
  const supabase = createAdminClient();
  const empty: UserUsageSnapshot = {
    sceneCount: 0,
    sentenceCount: 0,
    storageBytes: null,
    lastActiveAt: null,
    datasetUpdatedAt: null,
    progressUpdatedAt: null,
    statsUpdatedAt: null,
  };
  if (!supabase) return empty;

  const [datasetRes, progressRes, statsRes, sentencesRes] = await Promise.all([
    supabase
      .from("user_datasets")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_progress")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_stats")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_sentences")
      .select("sentence_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const fromJson = countLibraryUsage(datasetRes.data?.data);
  const sentenceCount =
    typeof sentencesRes.count === "number" && sentencesRes.count > 0
      ? sentencesRes.count
      : fromJson.sentenceCount;

  const timestamps = [
    datasetRes.data?.updated_at,
    progressRes.data?.updated_at,
    statsRes.data?.updated_at,
  ].filter((v): v is string => Boolean(v));
  const lastActiveAt =
    timestamps.length > 0
      ? timestamps.reduce((a, b) => (a > b ? a : b))
      : null;

  return {
    sceneCount: fromJson.sceneCount,
    sentenceCount,
    storageBytes: null,
    lastActiveAt,
    datasetUpdatedAt: datasetRes.data?.updated_at ?? null,
    progressUpdatedAt: progressRes.data?.updated_at ?? null,
    statsUpdatedAt: statsRes.data?.updated_at ?? null,
  };
}

export async function fetchSystemHealthAdmin(): Promise<{
  totalUsers: number;
  staffUsers: number;
  usersWithDatasets: number;
  usersActiveLast7Days: number;
  billingLive: false;
  mrrEstimate: null;
  errorRateOverview: null;
  apiCostTracking: null;
}> {
  const supabase = createAdminClient();
  const base = {
    totalUsers: 0,
    staffUsers: 0,
    usersWithDatasets: 0,
    usersActiveLast7Days: 0,
    billingLive: false as const,
    mrrEstimate: null,
    errorRateOverview: null,
    apiCostTracking: null,
  };
  if (!supabase) return base;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [profilesRes, staffRes, datasetsRes, progressRes] = await Promise.all([
    supabase.from("profiles").select("user_id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .in("role", ["admin", "support"] satisfies AppRole[]),
    supabase.from("user_datasets").select("user_id", { count: "exact", head: true }),
    supabase
      .from("user_progress")
      .select("user_id", { count: "exact", head: true })
      .gte("updated_at", weekAgo),
  ]);

  return {
    ...base,
    totalUsers: profilesRes.count ?? 0,
    staffUsers: staffRes.count ?? 0,
    usersWithDatasets: datasetsRes.count ?? 0,
    usersActiveLast7Days: progressRes.count ?? 0,
  };
}
