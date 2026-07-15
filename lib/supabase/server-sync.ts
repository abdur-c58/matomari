import type { Dataset, UserLibrary } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { SyncTable } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileOwnerShares } from "@/lib/services/island-sharing-service";

export async function pushRemoteDataAdmin(
  userId: string,
  table: SyncTable,
  payload: unknown,
  options?: { expectedRevision?: number | null }
): Promise<{ ok: boolean; error?: string; conflict?: boolean; revision?: number }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase admin client is not configured" };
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from(table)
    .select("revision, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const currentRevision = Number(existing?.revision ?? 0);
  if (
    options?.expectedRevision != null &&
    existing &&
    currentRevision !== options.expectedRevision
  ) {
    return {
      ok: false,
      conflict: true,
      revision: currentRevision,
      error: `Revision conflict (expected ${options.expectedRevision}, found ${currentRevision})`,
    };
  }

  const nextRevision = currentRevision + 1;
  const row: Record<string, unknown> = {
    user_id: userId,
    data: payload,
    updated_at: now,
    revision: nextRevision,
  };

  if (table === "user_datasets") {
    row.imported_at = now;
  }

  const { error } = await supabase.from(table).upsert(row, { onConflict: "user_id" });
  if (error) {
    console.warn(`Supabase push failed (${table}):`, error.message);
    return { ok: false, error: error.message };
  }

  // When the owner deletes an island, cascade-delete orphan share rows (and memberships).
  if (table === "user_datasets" && payload && typeof payload === "object") {
    const islands = (payload as UserLibrary).islands;
    if (islands && typeof islands === "object") {
      try {
        await reconcileOwnerShares(userId, islands);
      } catch (reconcileError) {
        console.warn("Island share reconciliation failed:", reconcileError);
      }
    }
  }

  return { ok: true, revision: nextRevision };
}

export async function checkSyncTablesReady(): Promise<{ ready: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ready: false, error: "SUPABASE_SECRET_KEY is not configured" };
  }

  const { error } = await supabase.from("user_datasets").select("user_id").limit(1);
  if (error) {
    if (error.message.includes("Could not find the table")) {
      return {
        ready: false,
        error: "Database tables missing — run supabase/migrations/001_initial.sql in the Supabase SQL Editor",
      };
    }
    return { ready: false, error: error.message };
  }
  return { ready: true };
}

export async function fetchRemoteDatasetAdmin(
  userId: string
): Promise<{ data: Dataset; updatedAt: string; revision: number } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_datasets")
    .select("data, updated_at, revision")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    data: data.data as Dataset,
    updatedAt: data.updated_at,
    revision: Number(data.revision ?? 1),
  };
}

/** Prefer this for sharing — cloud payload is UserLibrary-shaped. */
export async function fetchRemoteLibraryAdmin(
  userId: string
): Promise<{ data: UserLibrary; updatedAt: string; revision: number } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_datasets")
    .select("data, updated_at, revision")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    data: data.data as UserLibrary,
    updatedAt: data.updated_at,
    revision: Number(data.revision ?? 1),
  };
}

export async function fetchRemoteProgressAdmin(
  userId: string
): Promise<{ data: UserProgress; updatedAt: string; revision: number } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("data, updated_at, revision")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    data: data.data as UserProgress,
    updatedAt: data.updated_at,
    revision: Number(data.revision ?? 1),
  };
}

export async function fetchRemoteStatsAdmin(
  userId: string
): Promise<{ data: AppStats; updatedAt: string; revision: number } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("data, updated_at, revision")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    data: data.data as AppStats,
    updatedAt: data.updated_at,
    revision: Number(data.revision ?? 1),
  };
}
