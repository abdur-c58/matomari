import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken } from "@/lib/services/scene-identity-service";

export type SceneShareRow = {
  id: string;
  ownerUserId: string;
  sourceSceneId: string;
  shareTokenHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SharedMembershipRow = {
  shareId: string;
  userId: string;
  addedAt: string;
};

function mapShare(row: {
  id: string;
  owner_user_id: string;
  source_scene_id: string;
  share_token_hash: string | null;
  created_at: string;
  updated_at: string;
}): SceneShareRow {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    sourceSceneId: row.source_scene_id,
    shareTokenHash: row.share_token_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findShareByTokenHashAdmin(
  tokenHash: string
): Promise<SceneShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("scene_shares")
    .select("id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at")
    .eq("share_token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function findShareByTokenAdmin(token: string): Promise<SceneShareRow | null> {
  return findShareByTokenHashAdmin(hashShareToken(token));
}

export async function findShareByOwnerAndSceneAdmin(
  ownerUserId: string,
  sourceSceneId: string
): Promise<SceneShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("scene_shares")
    .select("id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at")
    .eq("owner_user_id", ownerUserId)
    .eq("source_scene_id", sourceSceneId)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function findShareByIdAdmin(shareId: string): Promise<SceneShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("scene_shares")
    .select("id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at")
    .eq("id", shareId)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function upsertSceneShareAdmin(params: {
  ownerUserId: string;
  sourceSceneId: string;
  shareTokenHash: string | null;
}): Promise<SceneShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const existing = await findShareByOwnerAndSceneAdmin(
    params.ownerUserId,
    params.sourceSceneId
  );

  if (existing) {
    const { data, error } = await supabase
      .from("scene_shares")
      .update({
        share_token_hash: params.shareTokenHash,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at")
      .maybeSingle();
    if (error || !data) {
      console.warn("Scene share update failed:", error?.message);
      return null;
    }
    return mapShare(data);
  }

  const { data, error } = await supabase
    .from("scene_shares")
    .insert({
      owner_user_id: params.ownerUserId,
      source_scene_id: params.sourceSceneId,
      share_token_hash: params.shareTokenHash,
      created_at: now,
      updated_at: now,
    })
    .select("id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.warn("Scene share insert failed:", error?.message);
    return null;
  }
  return mapShare(data);
}

export async function revokeSceneShareAdmin(shareId: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("scene_shares")
    .update({
      share_token_hash: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) {
    console.warn("Scene share revoke failed:", error.message);
    return false;
  }
  return true;
}

export async function deleteSceneSharesForMissingSourcesAdmin(
  ownerUserId: string,
  existingSceneIds: Set<string>
): Promise<string[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("scene_shares")
    .select("id, source_scene_id")
    .eq("owner_user_id", ownerUserId);

  if (error || !data) return [];

  const orphanIds = data
    .filter((row) => !existingSceneIds.has(row.source_scene_id))
    .map((row) => row.id as string);

  if (orphanIds.length === 0) return [];

  const { error: deleteError } = await supabase
    .from("scene_shares")
    .delete()
    .in("id", orphanIds);

  if (deleteError) {
    console.warn("Orphan scene share cleanup failed:", deleteError.message);
    return [];
  }
  return orphanIds;
}

export async function listMembershipsForUserAdmin(
  userId: string
): Promise<Array<SharedMembershipRow & { share: SceneShareRow }>> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shared_scene_memberships")
    .select(
      "share_id, user_id, added_at, scene_shares ( id, owner_user_id, source_scene_id, share_token_hash, created_at, updated_at )"
    )
    .eq("user_id", userId);

  if (error || !data) return [];

  const rows: Array<SharedMembershipRow & { share: SceneShareRow }> = [];
  for (const row of data) {
    const shareRaw = row.scene_shares as
      | {
          id: string;
          owner_user_id: string;
          source_scene_id: string;
          share_token_hash: string | null;
          created_at: string;
          updated_at: string;
        }
      | Array<{
          id: string;
          owner_user_id: string;
          source_scene_id: string;
          share_token_hash: string | null;
          created_at: string;
          updated_at: string;
        }>
      | null;

    const share = Array.isArray(shareRaw) ? shareRaw[0] : shareRaw;
    if (!share) continue;
    rows.push({
      shareId: row.share_id,
      userId: row.user_id,
      addedAt: row.added_at,
      share: mapShare(share),
    });
  }
  return rows;
}

export async function addMembershipAdmin(
  shareId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from("shared_scene_memberships").upsert(
    {
      share_id: shareId,
      user_id: userId,
      added_at: new Date().toISOString(),
    },
    { onConflict: "share_id,user_id" }
  );

  if (error) {
    console.warn("Membership add failed:", error.message);
    return false;
  }
  return true;
}

export async function removeMembershipAdmin(
  shareId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("shared_scene_memberships")
    .delete()
    .eq("share_id", shareId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Membership remove failed:", error.message);
    return false;
  }
  return true;
}

export async function hasMembershipAdmin(
  shareId: string,
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("shared_scene_memberships")
    .select("share_id")
    .eq("share_id", shareId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}
