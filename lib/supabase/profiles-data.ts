import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  updatedAt: string;
};

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
    .select("user_id, display_name, avatar_url, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.warn("Profile upsert failed:", error?.message);
    return null;
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    updatedAt: data.updated_at,
  };
}

export async function fetchProfileAdmin(userId: string): Promise<ProfileRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    updatedAt: data.updated_at,
  };
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
    .select("user_id, display_name, avatar_url, updated_at")
    .in("user_id", unique);

  if (error || !data) return map;
  for (const row of data) {
    map.set(row.user_id, {
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      updatedAt: row.updated_at,
    });
  }
  return map;
}
