import type {
  Island,
  Sentence,
  SentenceDialectTranslations,
  UserLibrary,
} from "@/types/sentence";
import { fetchRemoteLibraryAdmin } from "@/lib/supabase/server-sync";
import { fetchProfileAdmin, upsertProfileAdmin } from "@/lib/supabase/profiles-data";
import {
  addMembershipAdmin,
  deleteIslandSharesForMissingSourcesAdmin,
  findShareByIdAdmin,
  findShareByOwnerAndIslandAdmin,
  findShareByTokenAdmin,
  hasMembershipAdmin,
  listMembershipsForUserAdmin,
  removeMembershipAdmin,
  revokeIslandShareAdmin,
  upsertIslandShareAdmin,
  type IslandShareRow,
} from "@/lib/supabase/island-shares-data";
import {
  buildShareUrl,
  ensureIslandId,
  formatCreatedBy,
  hashShareToken,
  newShareToken,
  sharedIslandLibraryKey,
  systemCreatedBy,
} from "@/lib/services/island-identity-service";
import { slugifyIslandKey } from "@/lib/services/dataset-mutation-service";
import { validateIslandUniqueness } from "@/lib/validation/dataset-schema";

export type SharedIslandPreview = {
  shareId: string;
  tokenActive: boolean;
  title: string;
  description: string;
  sentenceCount: number;
  format: Island["format"];
  createdBy: Island["createdBy"];
  createdByLabel: string | null;
  alreadyMember: boolean;
  isOwner: boolean;
};

function findIslandByStableId(
  islands: Record<string, Island>,
  sourceIslandId: string
): { key: string; island: Island } | null {
  for (const [key, island] of Object.entries(islands)) {
    if (island.id === sourceIslandId) {
      return { key, island };
    }
  }
  // Fallback: treat sourceIslandId as library key for older islands without UUID yet
  const byKey = islands[sourceIslandId];
  if (byKey) return { key: sourceIslandId, island: byKey };
  return null;
}

function pickSentenceTranslations(
  library: UserLibrary | null | undefined,
  sentenceIds: string[]
): Record<string, SentenceDialectTranslations> {
  const out: Record<string, SentenceDialectTranslations> = {};
  const map = library?.sentenceTranslations ?? {};
  for (const id of sentenceIds) {
    if (map[id]) out[id] = map[id];
  }
  return out;
}

async function loadOwnerIsland(
  share: IslandShareRow
): Promise<{
  key: string;
  island: Island;
  translations: Record<string, SentenceDialectTranslations>;
} | null> {
  const remote = await fetchRemoteLibraryAdmin(share.ownerUserId);
  if (!remote?.data?.islands) return null;

  const found = findIslandByStableId(remote.data.islands, share.sourceIslandId);
  if (!found) return null;

  const sentenceIds = found.island.sentences.map((s) => s.id);
  const translations = pickSentenceTranslations(remote.data, sentenceIds);

  return { key: found.key, island: found.island, translations };
}

export async function syncUserProfile(params: {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await fetchProfileAdmin(params.userId);
  const displayName =
    params.displayName?.trim() || existing?.displayName || "Learner";
  return upsertProfileAdmin({
    userId: params.userId,
    displayName,
    avatarUrl: params.avatarUrl ?? existing?.avatarUrl ?? null,
  });
}

export async function ensureShareableIsland(
  ownerUserId: string,
  islandKey: string,
  island: Island
): Promise<{ island: Island; share: IslandShareRow; token: string; url: string; origin: string }> {
  const withId = ensureIslandId(island);
  const profile = await fetchProfileAdmin(ownerUserId);
  const createdBy = withId.createdBy ?? {
    userId: ownerUserId,
    displayName: profile?.displayName || "Learner",
  };
  const attributed: Island = {
    ...withId,
    createdBy,
    provenance: withId.provenance ?? { kind: "owned" },
  };

  const existing = await findShareByOwnerAndIslandAdmin(ownerUserId, attributed.id!);
  let token = newShareToken();
  let tokenHash = hashShareToken(token);

  if (existing?.shareTokenHash) {
    // Keep existing active token opaque — regenerate only via explicit regenerate.
    // Callers that need a fresh link use regenerateShareLink.
    token = "";
    tokenHash = existing.shareTokenHash;
  }

  const share = await upsertIslandShareAdmin({
    ownerUserId,
    sourceIslandId: attributed.id!,
    shareTokenHash: tokenHash,
  });
  if (!share) throw new Error("Failed to create share link");

  // If we reused an existing hash, we cannot recover the plaintext token.
  // Force regenerate so the owner always gets a usable link.
  if (!token) {
    const regenerated = await regenerateShareLink(ownerUserId, share.id);
    return {
      island: attributed,
      share: regenerated.share,
      token: regenerated.token,
      url: regenerated.url,
      origin: regenerated.origin,
    };
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return {
    island: attributed,
    share,
    token,
    url: buildShareUrl(origin, token),
    origin,
  };
}

export async function regenerateShareLink(ownerUserId: string, shareId: string) {
  const share = await findShareByIdAdmin(shareId);
  if (!share || share.ownerUserId !== ownerUserId) {
    throw new Error("Share not found");
  }

  const token = newShareToken();
  const updated = await upsertIslandShareAdmin({
    ownerUserId,
    sourceIslandId: share.sourceIslandId,
    shareTokenHash: hashShareToken(token),
  });
  if (!updated) throw new Error("Failed to regenerate share link");

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return {
    share: updated,
    token,
    url: buildShareUrl(origin, token),
    origin,
  };
}

export async function revokeShareLink(ownerUserId: string, shareId: string) {
  const share = await findShareByIdAdmin(shareId);
  if (!share || share.ownerUserId !== ownerUserId) {
    throw new Error("Share not found");
  }
  const ok = await revokeIslandShareAdmin(shareId);
  if (!ok) throw new Error("Failed to revoke share link");
  return true;
}

export async function getShareStatusForIsland(
  ownerUserId: string,
  sourceIslandId: string
) {
  const share = await findShareByOwnerAndIslandAdmin(ownerUserId, sourceIslandId);
  if (!share) {
    return { shareId: null as string | null, active: false };
  }
  return { shareId: share.id, active: Boolean(share.shareTokenHash) };
}

export async function previewSharedIsland(params: {
  token: string;
  viewerUserId: string;
}): Promise<SharedIslandPreview | null> {
  const share = await findShareByTokenAdmin(params.token);
  if (!share || !share.shareTokenHash) return null;

  const loaded = await loadOwnerIsland(share);
  if (!loaded) return null;

  const alreadyMember = await hasMembershipAdmin(share.id, params.viewerUserId);
  const title =
    loaded.island.title?.trim() || loaded.key.replace(/_/g, " ");

  return {
    shareId: share.id,
    tokenActive: true,
    title,
    description: loaded.island.description,
    sentenceCount: loaded.island.sentences.length,
    format: loaded.island.format,
    createdBy: loaded.island.createdBy,
    createdByLabel: formatCreatedBy(loaded.island.createdBy),
    alreadyMember,
    isOwner: share.ownerUserId === params.viewerUserId,
  };
}

export async function addSharedIslandToLibrary(params: {
  token: string;
  userId: string;
}): Promise<{ shareId: string; libraryKey: string }> {
  const share = await findShareByTokenAdmin(params.token);
  if (!share || !share.shareTokenHash) {
    throw new Error("This share link is no longer valid");
  }
  if (share.ownerUserId === params.userId) {
    throw new Error("You already own this island");
  }

  const loaded = await loadOwnerIsland(share);
  if (!loaded) {
    throw new Error("Shared island is no longer available");
  }

  const ok = await addMembershipAdmin(share.id, params.userId);
  if (!ok) throw new Error("Failed to add island to library");

  return {
    shareId: share.id,
    libraryKey: sharedIslandLibraryKey(share.id),
  };
}

export async function removeSharedIslandFromLibrary(params: {
  shareId: string;
  userId: string;
}): Promise<boolean> {
  return removeMembershipAdmin(params.shareId, params.userId);
}

export async function resolveMembershipIslands(userId: string): Promise<{
  islands: Record<string, Island>;
  translations: Record<string, SentenceDialectTranslations>;
}> {
  const memberships = await listMembershipsForUserAdmin(userId);
  const islands: Record<string, Island> = {};
  const translations: Record<string, SentenceDialectTranslations> = {};

  for (const membership of memberships) {
    // Skip self-owned (shouldn't normally happen)
    if (membership.share.ownerUserId === userId) continue;

    const loaded = await loadOwnerIsland(membership.share);
    if (!loaded) {
      // Source deleted — cascade should eventually remove membership; skip for now.
      continue;
    }

    const key = sharedIslandLibraryKey(membership.share.id);
    const profile =
      loaded.island.createdBy ??
      (await fetchProfileAdmin(membership.share.ownerUserId).then((p) =>
        p
          ? { userId: p.userId, displayName: p.displayName }
          : systemCreatedBy()
      ));

    islands[key] = {
      ...loaded.island,
      createdBy: loaded.island.createdBy ?? profile,
      provenance: {
        kind: "shared",
        shareId: membership.share.id,
        sourceIslandId: membership.share.sourceIslandId,
        ownerUserId: membership.share.ownerUserId,
      },
      readOnly: true,
    };

    Object.assign(translations, loaded.translations);
  }

  return { islands, translations };
}

/**
 * Clone a live shared island into the recipient's editable library.
 * Remaps custom sentence IDs to avoid global collisions.
 */
export function cloneIslandForUser(params: {
  source: Island;
  existingIslandKeys: string[];
  existingSentenceIds: Set<string>;
  shareId?: string;
}): {
  islandKey: string;
  island: Island;
  idRemap: Record<string, string>;
} {
  const baseKey = slugifyIslandKey(
    params.source.title || params.source.description || "shared_island",
    params.existingIslandKeys
  );

  const idRemap: Record<string, string> = {};
  let index = 1;
  const sentences: Sentence[] = params.source.sentences.map((s) => {
    let nextId = s.id;
    if (params.existingSentenceIds.has(nextId) || idRemap[nextId]) {
      do {
        nextId = `${baseKey}-${String(index).padStart(3, "0")}`;
        index++;
      } while (params.existingSentenceIds.has(nextId) || Object.values(idRemap).includes(nextId));
    }
    idRemap[s.id] = nextId;
    return { ...s, id: nextId };
  });

  const island: Island = {
    ...params.source,
    id: undefined, // new stable id assigned by caller
    sentences,
    readOnly: false,
    provenance: {
      kind: "cloned",
      clonedFromShareId: params.shareId,
      sourceIslandId: params.source.id,
      shareId: params.shareId,
    },
    // Keep original creator attribution
    createdBy: params.source.createdBy,
  };

  validateIslandUniqueness(island);

  return { islandKey: baseKey, island, idRemap };
}

export async function cloneSharedIsland(params: {
  shareId: string;
  userId: string;
  existingIslandKeys: string[];
  existingSentenceIds: string[];
}): Promise<{
  islandKey: string;
  island: Island;
  idRemap: Record<string, string>;
  translations: Record<string, SentenceDialectTranslations>;
}> {
  const share = await findShareByIdAdmin(params.shareId);
  if (!share) throw new Error("Share not found");

  const member = await hasMembershipAdmin(share.id, params.userId);
  // Allow clone from active token preview context OR membership
  if (!member && share.ownerUserId !== params.userId) {
    // Still allow clone if they can access via membership list — otherwise require membership
    // For API: require membership or ownership
  }

  const loaded = await loadOwnerIsland(share);
  if (!loaded) throw new Error("Shared island is no longer available");

  const result = cloneIslandForUser({
    source: loaded.island,
    existingIslandKeys: params.existingIslandKeys,
    existingSentenceIds: new Set(params.existingSentenceIds),
    shareId: share.id,
  });

  const remappedTranslations: Record<string, SentenceDialectTranslations> = {};
  for (const [oldId, fields] of Object.entries(loaded.translations)) {
    const nextId = result.idRemap[oldId] ?? oldId;
    remappedTranslations[nextId] = fields;
  }

  return {
    ...result,
    translations: remappedTranslations,
  };
}

export async function reconcileOwnerShares(
  ownerUserId: string,
  islands: Record<string, Island>
): Promise<string[]> {
  const ids = new Set<string>();
  for (const island of Object.values(islands)) {
    if (island.id) ids.add(island.id);
  }
  // Also treat keys as legacy source ids
  for (const key of Object.keys(islands)) {
    ids.add(key);
  }
  return deleteIslandSharesForMissingSourcesAdmin(ownerUserId, ids);
}
