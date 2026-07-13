import type { IslandSuggestion } from "@/lib/ai/types";
import { islandSuggestionSchema } from "@/lib/ai/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

function parseSuggestions(raw: unknown): IslandSuggestion[] | null {
  if (!Array.isArray(raw)) return null;
  const suggestions: IslandSuggestion[] = [];
  for (const item of raw) {
    const parsed = islandSuggestionSchema.safeParse(item);
    if (!parsed.success) return null;
    suggestions.push(parsed.data);
  }
  return suggestions.length > 0 ? suggestions : null;
}

export async function fetchCachedIslandSuggestions(
  userId: string
): Promise<IslandSuggestion[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_island_suggestions")
    .select("suggestions")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return parseSuggestions(data.suggestions);
}

export async function upsertCachedIslandSuggestions(
  userId: string,
  suggestions: IslandSuggestion[]
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from("user_island_suggestions").upsert(
    {
      user_id: userId,
      suggestions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("Failed to cache island suggestions:", error.message);
    return false;
  }
  return true;
}
