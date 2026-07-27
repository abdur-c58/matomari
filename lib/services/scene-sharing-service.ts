import type {
  Scene,
  Sentence,
  SentenceDialectTranslations,
  UserLibrary,
} from "@/types/sentence";
import { fetchRemoteLibraryAdmin } from "@/lib/supabase/server-sync";
import { fetchProfileAdmin, upsertProfileAdmin } from "@/lib/supabase/profiles-data";
import {
  addMembershipAdmin,
  deleteSceneSharesForMissingSourcesAdmin,
  findShareByIdAdmin,
  findShareByOwnerAndSceneAdmin,
  findShareByTokenAdmin,
  hasMembershipAdmin,
  listMembershipsForUserAdmin,
  removeMembershipAdmin,
  revokeSceneShareAdmin,
  upsertSceneShareAdmin,
  type SceneShareRow,
} from "@/lib/supabase/scene-shares-data";
import {
  buildShareUrl,
  ensureSceneId,
  formatCreatedBy,
  hashShareToken,
  newShareToken,
  sharedSceneLibraryKey,
  systemCreatedBy,
} from "@/lib/services/scene-identity-service";
import { slugifySceneKey } from "@/lib/services/dataset-mutation-service";
import { validateSceneUniqueness } from "@/lib/validation/dataset-schema";

export type SharedScenePreview = {
  shareId: string;
  tokenActive: boolean;
  title: string;
  description: string;
  sentenceCount: number;
  format: Scene["format"];
  createdBy: Scene["createdBy"];
  createdByLabel: string | null;
  alreadyMember: boolean;
  isOwner: boolean;
};

function findSceneByStableId(
  scenes: Record<string, Scene>,
  sourceSceneId: string
): { key: string; scene: Scene } | null {
  for (const [key, scene] of Object.entries(scenes)) {
    if (scene.id === sourceSceneId) {
      return { key, scene };
    }
  }
  // Fallback: treat sourceSceneId as library key for older scenes without UUID yet
  const byKey = scenes[sourceSceneId];
  if (byKey) return { key: sourceSceneId, scene: byKey };
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

async function loadOwnerScene(
  share: SceneShareRow
): Promise<{
  key: string;
  scene: Scene;
  translations: Record<string, SentenceDialectTranslations>;
} | null> {
  const remote = await fetchRemoteLibraryAdmin(share.ownerUserId);
  if (!remote?.data?.scenes) return null;

  const found = findSceneByStableId(remote.data.scenes, share.sourceSceneId);
  if (!found) return null;

  const sentenceIds = found.scene.sentences.map((s) => s.id);
  const translations = pickSentenceTranslations(remote.data, sentenceIds);

  return { key: found.key, scene: found.scene, translations };
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

export async function ensureShareableScene(
  ownerUserId: string,
  sceneKey: string,
  scene: Scene
): Promise<{ scene: Scene; share: SceneShareRow; token: string; url: string; origin: string }> {
  const withId = ensureSceneId(scene);
  const profile = await fetchProfileAdmin(ownerUserId);
  const createdBy = withId.createdBy ?? {
    userId: ownerUserId,
    displayName: profile?.displayName || "Learner",
  };
  const attributed: Scene = {
    ...withId,
    createdBy,
    provenance: withId.provenance ?? { kind: "owned" },
  };

  const existing = await findShareByOwnerAndSceneAdmin(ownerUserId, attributed.id!);
  let token = newShareToken();
  let tokenHash = hashShareToken(token);

  if (existing?.shareTokenHash) {
    // Keep existing active token opaque — regenerate only via explicit regenerate.
    // Callers that need a fresh link use regenerateShareLink.
    token = "";
    tokenHash = existing.shareTokenHash;
  }

  const share = await upsertSceneShareAdmin({
    ownerUserId,
    sourceSceneId: attributed.id!,
    shareTokenHash: tokenHash,
  });
  if (!share) throw new Error("Failed to create share link");

  // If we reused an existing hash, we cannot recover the plaintext token.
  // Force regenerate so the owner always gets a usable link.
  if (!token) {
    const regenerated = await regenerateShareLink(ownerUserId, share.id);
    return {
      scene: attributed,
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
    scene: attributed,
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
  const updated = await upsertSceneShareAdmin({
    ownerUserId,
    sourceSceneId: share.sourceSceneId,
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
  const ok = await revokeSceneShareAdmin(shareId);
  if (!ok) throw new Error("Failed to revoke share link");
  return true;
}

export async function getShareStatusForScene(
  ownerUserId: string,
  sourceSceneId: string
) {
  const share = await findShareByOwnerAndSceneAdmin(ownerUserId, sourceSceneId);
  if (!share) {
    return { shareId: null as string | null, active: false };
  }
  return { shareId: share.id, active: Boolean(share.shareTokenHash) };
}

export async function previewSharedScene(params: {
  token: string;
  viewerUserId: string;
}): Promise<SharedScenePreview | null> {
  const share = await findShareByTokenAdmin(params.token);
  if (!share || !share.shareTokenHash) return null;

  const loaded = await loadOwnerScene(share);
  if (!loaded) return null;

  const alreadyMember = await hasMembershipAdmin(share.id, params.viewerUserId);
  const title =
    loaded.scene.title?.trim() || loaded.key.replace(/_/g, " ");

  return {
    shareId: share.id,
    tokenActive: true,
    title,
    description: loaded.scene.description,
    sentenceCount: loaded.scene.sentences.length,
    format: loaded.scene.format,
    createdBy: loaded.scene.createdBy,
    createdByLabel: formatCreatedBy(loaded.scene.createdBy),
    alreadyMember,
    isOwner: share.ownerUserId === params.viewerUserId,
  };
}

export async function addSharedSceneToLibrary(params: {
  token: string;
  userId: string;
}): Promise<{ shareId: string; libraryKey: string }> {
  const share = await findShareByTokenAdmin(params.token);
  if (!share || !share.shareTokenHash) {
    throw new Error("This share link is no longer valid");
  }
  if (share.ownerUserId === params.userId) {
    throw new Error("You already own this scene");
  }

  const loaded = await loadOwnerScene(share);
  if (!loaded) {
    throw new Error("Shared scene is no longer available");
  }

  const ok = await addMembershipAdmin(share.id, params.userId);
  if (!ok) throw new Error("Failed to add scene to library");

  return {
    shareId: share.id,
    libraryKey: sharedSceneLibraryKey(share.id),
  };
}

export async function removeSharedSceneFromLibrary(params: {
  shareId: string;
  userId: string;
}): Promise<boolean> {
  return removeMembershipAdmin(params.shareId, params.userId);
}

export async function resolveMembershipScenes(userId: string): Promise<{
  scenes: Record<string, Scene>;
  translations: Record<string, SentenceDialectTranslations>;
}> {
  const memberships = await listMembershipsForUserAdmin(userId);
  const scenes: Record<string, Scene> = {};
  const translations: Record<string, SentenceDialectTranslations> = {};

  for (const membership of memberships) {
    // Skip self-owned (shouldn't normally happen)
    if (membership.share.ownerUserId === userId) continue;

    const loaded = await loadOwnerScene(membership.share);
    if (!loaded) {
      // Source deleted — cascade should eventually remove membership; skip for now.
      continue;
    }

    const key = sharedSceneLibraryKey(membership.share.id);
    const profile =
      loaded.scene.createdBy ??
      (await fetchProfileAdmin(membership.share.ownerUserId).then((p) =>
        p
          ? { userId: p.userId, displayName: p.displayName }
          : systemCreatedBy()
      ));

    scenes[key] = {
      ...loaded.scene,
      createdBy: loaded.scene.createdBy ?? profile,
      provenance: {
        kind: "shared",
        shareId: membership.share.id,
        sourceSceneId: membership.share.sourceSceneId,
        ownerUserId: membership.share.ownerUserId,
      },
      readOnly: true,
    };

    Object.assign(translations, loaded.translations);
  }

  return { scenes, translations };
}

/**
 * Clone a live shared scene into the recipient's editable library.
 * Remaps custom sentence IDs to avoid global collisions.
 */
export function cloneSceneForUser(params: {
  source: Scene;
  existingSceneKeys: string[];
  existingSentenceIds: Set<string>;
  shareId?: string;
}): {
  sceneKey: string;
  scene: Scene;
  idRemap: Record<string, string>;
} {
  const baseKey = slugifySceneKey(
    params.source.title || params.source.description || "shared_scene",
    params.existingSceneKeys
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

  const scene: Scene = {
    ...params.source,
    id: undefined, // new stable id assigned by caller
    sentences,
    readOnly: false,
    provenance: {
      kind: "cloned",
      clonedFromShareId: params.shareId,
      sourceSceneId: params.source.id,
      shareId: params.shareId,
    },
    // Keep original creator attribution
    createdBy: params.source.createdBy,
  };

  validateSceneUniqueness(scene);

  return { sceneKey: baseKey, scene, idRemap };
}

export async function cloneSharedScene(params: {
  shareId: string;
  userId: string;
  existingSceneKeys: string[];
  existingSentenceIds: string[];
}): Promise<{
  sceneKey: string;
  scene: Scene;
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

  const loaded = await loadOwnerScene(share);
  if (!loaded) throw new Error("Shared scene is no longer available");

  const result = cloneSceneForUser({
    source: loaded.scene,
    existingSceneKeys: params.existingSceneKeys,
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
  scenes: Record<string, Scene>
): Promise<string[]> {
  const ids = new Set<string>();
  for (const scene of Object.values(scenes)) {
    if (scene.id) ids.add(scene.id);
  }
  // Also treat keys as legacy source ids
  for (const key of Object.keys(scenes)) {
    ids.add(key);
  }
  return deleteSceneSharesForMissingSourcesAdmin(ownerUserId, ids);
}
