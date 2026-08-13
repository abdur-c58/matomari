import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { getAudioMetadataByTextHash } from "@/lib/supabase/server-data";
import { getAudioR2Key, getR2Object, r2ObjectExists } from "@/lib/storage/r2-client";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";

type RouteContext = { params: Promise<{ hash: string }> };

/**
 * Stream or redirect to an immutable audio asset by text hash.
 * Supports Range via signed redirect when available.
 */
export async function GET(request: Request, context: RouteContext) {
  if (ONLINE_FIRST_ENABLED) {
    const user = await requireUserSession();
    if (!user.ok) {
      return NextResponse.json({ error: user.error }, { status: user.status });
    }
  }

  const { hash } = await context.params;
  const textHash = decodeURIComponent(hash);
  if (!textHash || textHash.length < 8) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  }

  const meta = await getAudioMetadataByTextHash(textHash);
  const r2Key = meta?.r2_key ?? getAudioR2Key(textHash);

  if (!(await r2ObjectExists(r2Key))) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const preferRedirect = new URL(request.url).searchParams.get("redirect") !== "0";
  if (preferRedirect) {
    const signed = await getSignedAudioUrl(r2Key, 3600);
    if (signed) {
      return NextResponse.redirect(signed, 302);
    }
  }

  const buffer = await getR2Object(r2Key);
  if (!buffer) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : buffer.length - 1;
      const slice = buffer.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(slice), {
        status: 206,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(slice.length),
          "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "X-Audio-Hash": textHash,
    },
  });
}
