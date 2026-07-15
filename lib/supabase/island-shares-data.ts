import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken } from "@/lib/services/island-identity-service";

export type IslandShareRow = {
  id: string;
  ownerUserId: string;
  sourceIslandId: string;
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
  source_island_id: string;
  share_token_hash: string | null;
  created_at: string;
  updated_at: string;
}): IslandShareRow {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    sourceIslandId: row.source_island_id,
    shareTokenHash: row.share_token_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findShareByTokenHashAdmin(
  tokenHash: string
): Promise<IslandShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("island_shares")
    .select("id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at")
    .eq("share_token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function findShareByTokenAdmin(token: string): Promise<IslandShareRow | null> {
  return findShareByTokenHashAdmin(hashShareToken(token));
}

export async function findShareByOwnerAndIslandAdmin(
  ownerUserId: string,
  sourceIslandId: string
): Promise<IslandShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("island_shares")
    .select("id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at")
    .eq("owner_user_id", ownerUserId)
    .eq("source_island_id", sourceIslandId)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function findShareByIdAdmin(shareId: string): Promise<IslandShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("island_shares")
    .select("id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at")
    .eq("id", shareId)
    .maybeSingle();

  if (error || !data) return null;
  return mapShare(data);
}

export async function upsertIslandShareAdmin(params: {
  ownerUserId: string;
  sourceIslandId: string;
  shareTokenHash: string | null;
}): Promise<IslandShareRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const existing = await findShareByOwnerAndIslandAdmin(
    params.ownerUserId,
    params.sourceIslandId
  );

  if (existing) {
    const { data, error } = await supabase
      .from("island_shares")
      .update({
        share_token_hash: params.shareTokenHash,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at")
      .maybeSingle();
    if (error || !data) {
      console.warn("Island share update failed:", error?.message);
      return null;
    }
    return mapShare(data);
  }

  const { data, error } = await supabase
    .from("island_shares")
    .insert({
      owner_user_id: params.ownerUserId,
      source_island_id: params.sourceIslandId,
      share_token_hash: params.shareTokenHash,
      created_at: now,
      updated_at: now,
    })
    .select("id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.warn("Island share insert failed:", error?.message);
    return null;
  }
  return mapShare(data);
}

export async function revokeIslandShareAdmin(shareId: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("island_shares")
    .update({
      share_token_hash: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) {
    console.warn("Island share revoke failed:", error.message);
    return false;
  }
  return true;
}

export async function deleteIslandSharesForMissingSourcesAdmin(
  ownerUserId: string,
  existingIslandIds: Set<string>
): Promise<string[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("island_shares")
    .select("id, source_island_id")
    .eq("owner_user_id", ownerUserId);

  if (error || !data) return [];

  const orphanIds = data
    .filter((row) => !existingIslandIds.has(row.source_island_id))
    .map((row) => row.id as string);

  if (orphanIds.length === 0) return [];

  const { error: deleteError } = await supabase
    .from("island_shares")
    .delete()
    .in("id", orphanIds);

  if (deleteError) {
    console.warn("Orphan island share cleanup failed:", deleteError.message);
    return [];
  }
  return orphanIds;
}

export async function listMembershipsForUserAdmin(
  userId: string
): Promise<Array<SharedMembershipRow & { share: IslandShareRow }>> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("shared_island_memberships")
    .select(
      "share_id, user_id, added_at, island_shares ( id, owner_user_id, source_island_id, share_token_hash, created_at, updated_at )"
    )
    .eq("user_id", userId);

  if (error || !data) return [];

  const rows: Array<SharedMembershipRow & { share: IslandShareRow }> = [];
  for (const row of data) {
    const shareRaw = row.island_shares as
      | {
          id: string;
          owner_user_id: string;
          source_island_id: string;
          share_token_hash: string | null;
          created_at: string;
          updated_at: string;
        }
      | Array<{
          id: string;
          owner_user_id: string;
          source_island_id: string;
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

  const { error } = await supabase.from("shared_island_memberships").upsert(
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
    .from("shared_island_memberships")
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
    .from("shared_island_memberships")
    .select("share_id")
    .eq("share_id", shareId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}
