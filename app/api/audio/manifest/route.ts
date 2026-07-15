import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { listAudioMetadataForSentenceIds } from "@/lib/supabase/server-data";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";
import type { AudioManifestItem } from "@/types/audio-manifest";

const querySchema = z.object({
  sentenceIds: z.string().min(1),
  dialect: z.enum(["standard", "kansai"]).default("standard"),
  sign: z.enum(["0", "1"]).default("1"),
});

/** Build a download/stream manifest for a set of sentence IDs. */
export async function GET(request: Request) {
  if (ONLINE_FIRST_ENABLED) {
    const session = await auth();
    if (!session?.user?.supabaseUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      sentenceIds: url.searchParams.get("sentenceIds") ?? "",
      dialect: url.searchParams.get("dialect") ?? "standard",
      sign: url.searchParams.get("sign") ?? "1",
    });

    const sentenceIds = parsed.sentenceIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 800);

    const rows = await listAudioMetadataForSentenceIds(sentenceIds);
    const filtered = rows.filter(
      (r) => (r.dialect ?? "standard") === parsed.dialect
    );

    // Prefer newest/speaker-A preference: keep one entry per sentenceId+speaker
    const byKey = new Map<string, (typeof filtered)[number]>();
    for (const row of filtered) {
      const key = `${row.sentence_id}::${row.speaker ?? "A"}`;
      byKey.set(key, row);
    }

    const items: AudioManifestItem[] = [];
    for (const row of byKey.values()) {
      const urlSigned =
        parsed.sign === "1" ? await getSignedAudioUrl(row.r2_key) : null;
      items.push({
        sentenceId: row.sentence_id,
        textHash: row.text_hash,
        r2Key: row.r2_key,
        dialect: row.dialect ?? parsed.dialect,
        speaker: row.speaker ?? "A",
        byteSize: row.byte_size ?? null,
        url: urlSigned,
        streamPath: `/api/audio/${encodeURIComponent(row.text_hash)}`,
      });
    }

    const totalBytes = items.reduce(
      (n, item) => n + (item.byteSize ?? 0),
      0
    );

    return NextResponse.json({
      dialect: parsed.dialect,
      requested: sentenceIds.length,
      ready: items.length,
      totalBytes,
      items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Manifest failed" },
      { status: 400 }
    );
  }
}
