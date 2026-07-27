import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ensureShareableScene,
  getShareStatusForScene,
  regenerateShareLink,
  revokeShareLink,
} from "@/lib/services/scene-sharing-service";
import type { Scene } from "@/types/sentence";
import { sceneSchema } from "@/lib/validation/dataset-schema";
import { normalizeLegacySentence } from "@/lib/sentence-utils";

const createBodySchema = z.object({
  sceneKey: z.string().min(1),
  scene: sceneSchema,
});

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) return null;
  return userId;
}

function normalizeSceneInput(raw: z.infer<typeof sceneSchema>): Scene {
  return {
    description: raw.description,
    subtopics: raw.subtopics,
    title: raw.title,
    themeKanji: raw.themeKanji,
    featured: raw.featured,
    format: raw.format,
    speakers: raw.speakers,
    narrationMode: raw.narrationMode,
    id: raw.id,
    createdBy: raw.createdBy,
    difficultyMode: raw.difficultyMode,
    durationTier: raw.durationTier,
    provenance: raw.provenance,
    sentences: raw.sentences.map((s) => normalizeLegacySentence(s)),
  };
}

/** POST — create or return an active share link for an owned scene. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createBodySchema.parse(await request.json());
    const scene = normalizeSceneInput(body.scene);
    const result = await ensureShareableScene(userId, body.sceneKey, scene);

    return NextResponse.json({
      shareId: result.share.id,
      url: result.url,
      token: result.token,
      scene: result.scene,
      active: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create share";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** GET — share status for an owned scene (?sourceSceneId=). */
export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceSceneId = searchParams.get("sourceSceneId");
  if (!sourceSceneId) {
    return NextResponse.json({ error: "sourceSceneId required" }, { status: 400 });
  }

  const status = await getShareStatusForScene(userId, sourceSceneId);
  return NextResponse.json(status);
}

const mutateBodySchema = z.object({
  shareId: z.string().uuid(),
  action: z.enum(["revoke", "regenerate"]),
});

/** PATCH — revoke or regenerate a share link. */
export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = mutateBodySchema.parse(await request.json());
    if (body.action === "revoke") {
      await revokeShareLink(userId, body.shareId);
      return NextResponse.json({ ok: true, active: false });
    }

    const result = await regenerateShareLink(userId, body.shareId);
    return NextResponse.json({
      ok: true,
      active: true,
      shareId: result.share.id,
      url: result.url,
      token: result.token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update share";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
