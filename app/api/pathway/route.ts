import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseDataset } from "@/lib/validation/dataset-schema";
import { fetchSharedPathwayFromDb } from "@/lib/supabase/shared-pathway-data";

function loadFallbackPathway() {
  const filePath = path.join(process.cwd(), "public", "main-pathway.json");
  if (!fs.existsSync(filePath)) return null;

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const parsed = parseDataset(
    "main_pathway" in (raw as object)
      ? { ...(raw as object), scenes: {} }
      : { main_pathway: raw, scenes: {} }
  );

  if (!parsed.main_pathway.batches.length) return null;

  return {
    main_pathway: parsed.main_pathway,
    updatedAt: fs.statSync(filePath).mtime.toISOString(),
  };
}

export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since");

  const fromDb = await fetchSharedPathwayFromDb();
  const payload = fromDb ?? loadFallbackPathway();

  if (!payload) {
    return NextResponse.json(
      { error: "Shared pathway is not published yet" },
      { status: 404 }
    );
  }

  if (since && since >= payload.updatedAt) {
    return new NextResponse(null, { status: 304 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
