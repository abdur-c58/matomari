import { NextResponse } from "next/server";
import { fetchSharedTranslationsFromDb } from "@/lib/supabase/shared-translations-data";

export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since");

  const payload = await fetchSharedTranslationsFromDb(since);
  if (!payload) {
    // Config/unavailable — empty success so clients fall back to cache without 503 noise.
    return NextResponse.json(
      { translations: {}, updatedAt: since ?? new Date(0).toISOString() },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  }

  if (since && Object.keys(payload.translations).length === 0) {
    return new NextResponse(null, { status: 304 });
  }

  if (since && since >= payload.updatedAt) {
    return new NextResponse(null, { status: 304 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    },
  });
}
