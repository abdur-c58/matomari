import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ensureShareableIsland,
  getShareStatusForIsland,
  regenerateShareLink,
  revokeShareLink,
} from "@/lib/services/island-sharing-service";
import type { Island } from "@/types/sentence";
import { islandSchema } from "@/lib/validation/dataset-schema";
import { normalizeLegacySentence } from "@/lib/sentence-utils";

const createBodySchema = z.object({
  islandKey: z.string().min(1),
  island: islandSchema,
});

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) return null;
  return userId;
}

function normalizeIslandInput(raw: z.infer<typeof islandSchema>): Island {
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

/** POST — create or return an active share link for an owned island. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createBodySchema.parse(await request.json());
    const island = normalizeIslandInput(body.island);
    const result = await ensureShareableIsland(userId, body.islandKey, island);

    return NextResponse.json({
      shareId: result.share.id,
      url: result.url,
      token: result.token,
      island: result.island,
      active: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create share";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** GET — share status for an owned island (?sourceIslandId=). */
export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceIslandId = searchParams.get("sourceIslandId");
  if (!sourceIslandId) {
    return NextResponse.json({ error: "sourceIslandId required" }, { status: 400 });
  }

  const status = await getShareStatusForIsland(userId, sourceIslandId);
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
