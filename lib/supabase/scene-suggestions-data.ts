import type { SceneSuggestion } from "@/lib/ai/types";
import { sceneSuggestionSchema } from "@/lib/ai/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

function parseSuggestions(raw: unknown): SceneSuggestion[] | null {
  if (!Array.isArray(raw)) return null;
  const suggestions: SceneSuggestion[] = [];
  for (const item of raw) {
    const parsed = sceneSuggestionSchema.safeParse(item);
    if (!parsed.success) return null;
    suggestions.push(parsed.data);
  }
  return suggestions.length > 0 ? suggestions : null;
}

export async function fetchCachedSceneSuggestions(
  userId: string
): Promise<SceneSuggestion[] | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_scene_suggestions")
    .select("suggestions")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return parseSuggestions(data.suggestions);
}

export async function upsertCachedSceneSuggestions(
  userId: string,
  suggestions: SceneSuggestion[]
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from("user_scene_suggestions").upsert(
    {
      user_id: userId,
      suggestions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("Failed to cache scene suggestions:", error.message);
    return false;
  }
  return true;
}
