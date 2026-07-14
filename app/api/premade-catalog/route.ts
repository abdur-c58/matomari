import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parsePremadeCatalog } from "@/lib/validation/premade-catalog-schema";
import { EMPTY_PREMADE_CATALOG } from "@/types/premade-catalog";
import { fetchSharedPremadeFromDb } from "@/lib/supabase/shared-premade-data";

function loadFallbackPremadeCatalog() {
  const filePath = path.join(process.cwd(), "public", "premade-catalog.json");
  if (!fs.existsSync(filePath)) {
    return { catalog: EMPTY_PREMADE_CATALOG, updatedAt: EMPTY_PREMADE_CATALOG.updatedAt };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const catalog = parsePremadeCatalog(raw);
    return {
      catalog,
      updatedAt: catalog.updatedAt || fs.statSync(filePath).mtime.toISOString(),
    };
  } catch {
    return { catalog: EMPTY_PREMADE_CATALOG, updatedAt: EMPTY_PREMADE_CATALOG.updatedAt };
  }
}

export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since");

  const fromDb = await fetchSharedPremadeFromDb();
  const fallback = loadFallbackPremadeCatalog();
  const payload = fromDb ?? fallback.catalog;
  const updatedAt = fromDb?.updatedAt ?? fallback.updatedAt;

  if (since && since >= updatedAt) {
    return new NextResponse(null, { status: 304 });
  }

  return NextResponse.json(
    { ...payload, updatedAt },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
