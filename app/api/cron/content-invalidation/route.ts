import { NextResponse } from "next/server";
import {
  countStaleTranslations,
  processStaleTranslationsBatch,
  reconcileCanonicalContent,
} from "@/lib/cloud/sentence-invalidation";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Daily content invalidation:
 * 1. Reconcile catalog/pathway English against canonical_sentences
 * 2. Mark changed sentences' translations stale
 * 3. Retranslate a limited stale batch and enqueue TTS via durable writes
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const retranslateLimit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("retranslateLimit")) || 20)
  );
  const reconcileOnly = url.searchParams.get("reconcileOnly") === "1";

  try {
    const reconcile = await reconcileCanonicalContent();
    if (reconcileOnly) {
      const stale = await countStaleTranslations();
      return NextResponse.json({ reconcile, stale });
    }

    const retranslate = await processStaleTranslationsBatch(retranslateLimit);
    const stale = await countStaleTranslations();

    return NextResponse.json({
      reconcile,
      retranslate,
      stale,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalidation failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
