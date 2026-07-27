import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import {
  computeEffectiveTier,
  getUserSubscriptionAdmin,
} from "@/lib/services/billing";
import { hasMinTier } from "@/lib/constants/entitlements";
import {
  createSceneExportJob,
  processSceneExportJob,
} from "@/lib/services/scene-export-service";
import { fetchRemoteLibraryAdmin } from "@/lib/supabase/server-sync";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";
import type { Dialect } from "@/lib/constants/dialect";

export const maxDuration = 300;

type RouteContext = { params: Promise<{ key: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const sub = await getUserSubscriptionAdmin(user.userId);
  const tier = computeEffectiveTier(sub);
  if (!hasMinTier(tier, "pro")) {
    return NextResponse.json(
      {
        error: "Scene export requires Pro.",
        code: "export_requires_pro",
      },
      { status: 403 }
    );
  }

  const { key: sceneKey } = await context.params;
  let dialect: Dialect = "standard";
  try {
    const body = (await request.json()) as { dialect?: string };
    if (body.dialect === "kansai") dialect = "kansai";
  } catch {
    // optional
  }

  const library = await fetchRemoteLibraryAdmin(user.userId);
  const scene = library?.data?.scenes?.[sceneKey];
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const job = await createSceneExportJob({
    userId: user.userId,
    sceneKey,
    dialect,
  });
  if (!job) {
    return NextResponse.json(
      { error: "Could not start export job" },
      { status: 500 }
    );
  }

  const finished = await processSceneExportJob({
    jobId: job.id,
    userId: user.userId,
    sceneKey,
    scene,
    dialect,
    translations: library?.data?.sentenceTranslations,
  });

  if (!finished) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  let downloadUrl: string | null = null;
  if (finished.status === "ready" && finished.resultR2Key) {
    downloadUrl = await getSignedAudioUrl(finished.resultR2Key);
  }

  return NextResponse.json({
    job: finished,
    downloadUrl,
  });
}
