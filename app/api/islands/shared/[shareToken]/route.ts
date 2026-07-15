import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { previewSharedIsland } from "@/lib/services/island-sharing-service";

type RouteContext = { params: Promise<{ shareToken: string }> };

/** GET — authenticated read-only preview for a share token. */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareToken } = await context.params;
  if (!shareToken?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const preview = await previewSharedIsland({
    token: shareToken.trim(),
    viewerUserId: userId,
  });

  if (!preview) {
    return NextResponse.json(
      { error: "This share link is invalid or has been revoked" },
      { status: 404 }
    );
  }

  return NextResponse.json(preview);
}
