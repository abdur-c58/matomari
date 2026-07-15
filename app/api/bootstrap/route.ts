import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchSharedPremadeFromDb } from "@/lib/supabase/shared-premade-data";
import { fetchSharedTranslationsFromDb } from "@/lib/supabase/shared-translations-data";
import {
  fetchRemoteDatasetAdmin,
  fetchRemoteProgressAdmin,
  fetchRemoteStatsAdmin,
} from "@/lib/supabase/server-sync";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cloud-first bootstrap payload for authenticated clients. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [dataset, progress, stats, translations, premade, pathway] =
    await Promise.all([
      fetchRemoteDatasetAdmin(userId),
      fetchRemoteProgressAdmin(userId),
      fetchRemoteStatsAdmin(userId),
      fetchSharedTranslationsFromDb(),
      fetchSharedPremadeFromDb(),
      supabase
        ? supabase
            .from("shared_pathway")
            .select("data, updated_at, release_version")
            .eq("id", "main")
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    user: {
      dataset,
      progress,
      stats,
    },
    shared: {
      translations,
      premadeCatalog: premade,
      pathway: pathway
        ? {
            data: pathway.data,
            updatedAt: pathway.updated_at,
            releaseVersion: pathway.release_version ?? 1,
          }
        : null,
    },
  });
}
