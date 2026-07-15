import { createHash, randomUUID } from "crypto";
import { APP_NAME } from "@/lib/constants/branding";
import type { Island, IslandCreatedBy, IslandProvenance } from "@/types/sentence";

export const SHARED_ISLAND_KEY_PREFIX = "shared:";

export function newIslandId(): string {
  return randomUUID();
}

export function sharedIslandLibraryKey(shareId: string): string {
  return `${SHARED_ISLAND_KEY_PREFIX}${shareId}`;
}

export function parseSharedIslandLibraryKey(key: string): string | null {
  if (!key.startsWith(SHARED_ISLAND_KEY_PREFIX)) return null;
  const id = key.slice(SHARED_ISLAND_KEY_PREFIX.length);
  return id || null;
}

export function isSharedIslandLibraryKey(key: string): boolean {
  return parseSharedIslandLibraryKey(key) != null;
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newShareToken(): string {
  return randomUUID();
}

export function ensureIslandId(island: Island): Island {
  if (island.id) return island;
  return { ...island, id: newIslandId() };
}

export function systemCreatedBy(): IslandCreatedBy {
  return {
    userId: "system",
    displayName: APP_NAME,
  };
}

export function formatCreatedBy(createdBy?: IslandCreatedBy | null): string | null {
  const name = createdBy?.displayName?.trim();
  return name ? `Created by ${name}` : null;
}

export function withOwnedProvenance(
  island: Island,
  createdBy: IslandCreatedBy,
  kind: IslandProvenance["kind"] = "owned"
): Island {
  const withId = ensureIslandId(island);
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
