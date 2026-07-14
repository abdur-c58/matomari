import { parsePremadeCatalog } from "@/lib/validation/premade-catalog-schema";
import type { PremadeCatalog } from "@/types/premade-catalog";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";

export type SharedPremadePayload = PremadeCatalog;

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

export async function fetchSharedPremadeFromDb(): Promise<SharedPremadePayload | null> {
  const cfg = getRestConfig();
  if (!cfg) return null;

  const res = await fetch(
    `${cfg.url}/rest/v1/shared_premade_catalog?id=eq.main&select=data,updated_at`,
    { headers: restHeaders(cfg.key), cache: "no-store" }
  );

  if (!res.ok) return null;

  const rows = (await res.json()) as { data: unknown; updated_at: string }[];
  if (!rows[0]?.data) return null;

  try {
    const catalog = parsePremadeCatalog({
      ...(rows[0].data as object),
      updatedAt: rows[0].updated_at,
    });
    return catalog;
  } catch {
    return null;
  }
}
