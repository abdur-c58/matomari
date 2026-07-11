import type { SyncQueueItem } from "@/lib/repositories/types";
import { getDB } from "./index";

export async function enqueueSync(
  item: Omit<SyncQueueItem, "id" | "retries">
): Promise<void> {
  const db = await getDB();
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    retries: 0,
  };
  await db.put("syncQueue", entry, entry.id);
}

/** Keep only the latest pending payload per table. */
export async function enqueueSyncLatest(
  item: Omit<SyncQueueItem, "id" | "retries">
): Promise<void> {
  const db = await getDB();
  const pending = await db.getAll("syncQueue");
  for (const existing of pending) {
    if (existing.table === item.table) {
      await db.delete("syncQueue", existing.id);
    }
  }
  await enqueueSync(item);
}

export async function getPendingSync(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll("syncQueue");
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

export async function incrementSyncRetry(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get("syncQueue", id);
  if (!item) return;
  await db.put("syncQueue", { ...item, retries: item.retries + 1 }, id);
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const record = await db.get("meta", key);
  return record?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value }, key);
}
