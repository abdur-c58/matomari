import { createAdminClient } from "@/lib/supabase/admin";

export type AppRole = "user" | "admin" | "support";

export type ProfileRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: AppRole;
  updatedAt: string;
};

const PROFILE_SELECT = "user_id, display_name, avatar_url, role, updated_at";

function mapProfile(data: {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: AppRole | null;
  updated_at: string;
}): ProfileRow {
  return {
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role ?? "user",
    updatedAt: data.updated_at,
  };
}

/**
 * Upserts display fields only — never writes `role`.
 * Role changes must go through the admin service + audit helper.
 */
export async function upsertProfileAdmin(params: {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}): Promise<ProfileRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const displayName = params.displayName.trim() || "Learner";
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: params.userId,
        display_name: displayName,
        avatar_url: params.avatarUrl ?? null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error || !data) {
    console.warn("Profile upsert failed:", error?.message);
    return null;
  }

  return mapProfile(data);
}

export async function fetchProfileAdmin(userId: string): Promise<ProfileRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data);
}

export async function fetchProfilesAdmin(
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const supabase = createAdminClient();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("user_id", unique);

  if (error || !data) return map;
  for (const row of data) {
    map.set(row.user_id, mapProfile(row));
  }
  return map;
}

export async function listProfilesAdmin(params?: {
  role?: AppRole;
  search?: string;
  limit?: number;
}): Promise<ProfileRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .order("updated_at", { ascending: false })
    .limit(params?.limit ?? 500);

  if (params?.role) {
    query = query.eq("role", params.role);
  }

  if (params?.search?.trim()) {
    query = query.ilike("display_name", `%${params.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.warn("listProfilesAdmin failed:", error?.message);
    return [];
  }
  return data.map(mapProfile);
}
