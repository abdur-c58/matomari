import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { SyncTable } from "@/lib/repositories/types";

export type CloudSession = {
  authenticated: boolean;
  email: string | null;
  supabaseConfigured: boolean;
  tablesReady?: boolean;
  tablesError?: string | null;
};

export type RemotePullResponse = {
  dataset: { data: Dataset; updatedAt: string } | null;
  progress: { data: UserProgress; updatedAt: string } | null;
  stats: { data: AppStats; updatedAt: string } | null;
};

export async function fetchCloudSession(): Promise<CloudSession> {
  try {
    const res = await fetch("/api/sync/session", { credentials: "include" });
    if (!res.ok) {
      return { authenticated: false, email: null, supabaseConfigured: false };
    }
    return (await res.json()) as CloudSession;
  } catch {
    return { authenticated: false, email: null, supabaseConfigured: false };
  }
}

export async function pushRemoteItems(
  items: Array<{ table: SyncTable; payload: unknown }>
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (res.status === 401) {
    return { ok: false, error: "Sign in with Google to sync to the cloud" };
  }

  const data = (await res.json()) as { ok?: boolean; error?: string };
  return { ok: Boolean(data.ok), error: data.error };
}

export async function pullRemoteSnapshot(meta: {
  datasetUpdatedAt?: string | null;
  progressUpdatedAt?: string | null;
  statsUpdatedAt?: string | null;
}): Promise<RemotePullResponse | null> {
  const params = new URLSearchParams();
  if (meta.datasetUpdatedAt) params.set("datasetUpdatedAt", meta.datasetUpdatedAt);
  if (meta.progressUpdatedAt) params.set("progressUpdatedAt", meta.progressUpdatedAt);
  if (meta.statsUpdatedAt) params.set("statsUpdatedAt", meta.statsUpdatedAt);

  const res = await fetch(`/api/sync?${params.toString()}`, {
    credentials: "include",
  });

  if (res.status === 401) return null;
  if (!res.ok) return null;

  return (await res.json()) as RemotePullResponse;
}
