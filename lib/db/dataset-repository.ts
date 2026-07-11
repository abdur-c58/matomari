import type { Dataset } from "@/types/sentence";
import { getDB } from "./index";

const DATASET_KEY = "main";

export async function getDataset(): Promise<Dataset | null> {
  try {
    const db = await getDB();
    const record = await db.get("dataset", DATASET_KEY);
    return record?.data ?? null;
  } catch {
    return null;
  }
}

export async function saveDataset(data: Dataset): Promise<void> {
  const db = await getDB();
  await db.put("dataset", {
    id: DATASET_KEY,
    data,
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, DATASET_KEY);
}

export async function exportDataset(): Promise<Dataset | null> {
  return getDataset();
}

export async function hasDataset(): Promise<boolean> {
  const data = await getDataset();
  return data !== null;
}
