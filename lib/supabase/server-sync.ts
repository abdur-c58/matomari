import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { SyncTable } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function pushRemoteDataAdmin(
  userId: string,
  table: SyncTable,
  payload: unknown
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase admin client is not configured" };
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: userId,
    data: payload,
    updated_at: now,
  };

  if (table === "user_datasets") {
    row.imported_at = now;
  }

  const { error } = await supabase.from(table).upsert(row, { onConflict: "user_id" });
  if (error) {
    console.warn(`Supabase push failed (${table}):`, error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
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
): Promise<{ data: Dataset; updatedAt: string } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_datasets")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as Dataset, updatedAt: data.updated_at };
}

export async function fetchRemoteProgressAdmin(
  userId: string
): Promise<{ data: UserProgress; updatedAt: string } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as UserProgress, updatedAt: data.updated_at };
}

export async function fetchRemoteStatsAdmin(
  userId: string
): Promise<{ data: AppStats; updatedAt: string } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as AppStats, updatedAt: data.updated_at };
}
