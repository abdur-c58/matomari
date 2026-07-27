import { createHash, randomUUID } from "crypto";
import { APP_NAME } from "@/lib/constants/branding";
import type { Scene, SceneCreatedBy, SceneProvenance } from "@/types/sentence";

export const SHARED_SCENE_KEY_PREFIX = "shared:";

export function newSceneId(): string {
  return randomUUID();
}

export function sharedSceneLibraryKey(shareId: string): string {
  return `${SHARED_SCENE_KEY_PREFIX}${shareId}`;
}

export function parseSharedSceneLibraryKey(key: string): string | null {
  if (!key.startsWith(SHARED_SCENE_KEY_PREFIX)) return null;
  const id = key.slice(SHARED_SCENE_KEY_PREFIX.length);
  return id || null;
}

export function isSharedSceneLibraryKey(key: string): boolean {
  return parseSharedSceneLibraryKey(key) != null;
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newShareToken(): string {
  return randomUUID();
}

export function ensureSceneId(scene: Scene): Scene {
  if (scene.id) return scene;
  return { ...scene, id: newSceneId() };
}

export function systemCreatedBy(): SceneCreatedBy {
  return {
    userId: "system",
    displayName: APP_NAME,
  };
}

export function formatCreatedBy(createdBy?: SceneCreatedBy | null): string | null {
  const name = createdBy?.displayName?.trim();
  return name ? `Created by ${name}` : null;
}

export function withOwnedProvenance(
  scene: Scene,
  createdBy: SceneCreatedBy,
  kind: SceneProvenance["kind"] = "owned"
): Scene {
  const withId = ensureSceneId(scene);
  return {
    ...withId,
    createdBy: withId.createdBy ?? createdBy,
    provenance: withId.provenance ?? { kind },
    readOnly: false,
  };
}

export function buildShareUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/shared/${token}`;
}
