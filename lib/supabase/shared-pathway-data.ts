import type { Dataset } from "@/types/sentence";
import { parseDataset } from "@/lib/validation/dataset-schema";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";

export type SharedPathwayPayload = {
  main_pathway: Dataset["main_pathway"];
  updatedAt: string;
};

function getRestConfig(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return { url, key };
}

function restHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function fetchSharedPathwayFromDb(): Promise<SharedPathwayPayload | null> {
  const cfg = getRestConfig();
  if (!cfg) return null;

  const res = await fetch(
    `${cfg.url}/rest/v1/shared_pathway?id=eq.main&select=data,updated_at`,
    { headers: restHeaders(cfg.key), cache: "no-store" }
  );

  if (!res.ok) return null;

  const rows = (await res.json()) as { data: unknown; updated_at: string }[];
  if (!rows[0]?.data) return null;

  const row = rows[0];
  const rowData = row.data as { main_pathway?: Dataset["main_pathway"] };
  if (!rowData?.main_pathway?.batches?.length) return null;

  const parsed = parseDataset({
    main_pathway: rowData.main_pathway,
    islands: {},
  });

  return {
    main_pathway: parsed.main_pathway,
    updatedAt: rows[0].updated_at,
  };
}

export async function publishSharedPathwayToDb(
  mainPathway: Dataset["main_pathway"]
): Promise<boolean> {
  const cfg = getRestConfig();
  if (!cfg) return false;

  const res = await fetch(`${cfg.url}/rest/v1/shared_pathway`, {
    method: "POST",
    headers: {
      ...restHeaders(cfg.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: "main",
      data: { main_pathway: mainPathway },
      updated_at: new Date().toISOString(),
    }),
  });

  return res.ok;
}
