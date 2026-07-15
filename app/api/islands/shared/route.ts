import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  addSharedIslandToLibrary,
  removeSharedIslandFromLibrary,
  resolveMembershipIslands,
  cloneSharedIsland,
} from "@/lib/services/island-sharing-service";
import { newIslandId } from "@/lib/services/island-identity-service";

async function requireUserId() {
  const session = await auth();
  return session?.user?.supabaseUserId ?? null;
}

/** GET — resolve live membership islands for the signed-in user. */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveMembershipIslands(userId);
  return NextResponse.json(resolved);
}

const membershipBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    token: z.string().min(8),
  }),
  z.object({
    action: z.literal("remove"),
    shareId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("clone"),
    shareId: z.string().uuid(),
    existingIslandKeys: z.array(z.string()).default([]),
    existingSentenceIds: z.array(z.string()).default([]),
  }),
]);

/** POST — add membership, remove membership, or clone. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = membershipBodySchema.parse(await request.json());

    if (body.action === "add") {
      const result = await addSharedIslandToLibrary({
        token: body.token,
        userId,
      });
      return NextResponse.json(result);
    }

    if (body.action === "remove") {
      const ok = await removeSharedIslandFromLibrary({
        shareId: body.shareId,
        userId,
      });
      return NextResponse.json({ ok });
    }

    const cloned = await cloneSharedIsland({
      shareId: body.shareId,
      userId,
      existingIslandKeys: body.existingIslandKeys,
      existingSentenceIds: body.existingSentenceIds,
    });

    const island = {
      ...cloned.island,
      id: newIslandId(),
    };

    return NextResponse.json({
      islandKey: cloned.islandKey,
      island,
      idRemap: cloned.idRemap,
      translations: cloned.translations,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Membership action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
