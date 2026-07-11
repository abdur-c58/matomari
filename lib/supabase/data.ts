import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { SyncTable } from "@/lib/repositories/types";
import { createClient } from "@/lib/supabase/client";

export async function fetchRemoteDataset(
  userId: string
): Promise<{ data: Dataset; updatedAt: string } | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_datasets")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as Dataset, updatedAt: data.updated_at };
}

export async function fetchRemoteProgress(
  userId: string
): Promise<{ data: UserProgress; updatedAt: string } | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as UserProgress, updatedAt: data.updated_at };
}

export async function fetchRemoteStats(
  userId: string
): Promise<{ data: AppStats; updatedAt: string } | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return { data: data.data as AppStats, updatedAt: data.updated_at };
}

export async function pushRemoteData(
  userId: string,
  table: SyncTable,
  payload: unknown
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

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
  }
  return !error;
}
