import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { resolveTranslationScope } from "@/lib/cloud/sentence-scope";
import { persistDurableTranslationBatch } from "@/lib/supabase/durable-translations";
import { translatedFieldsSchema } from "@/lib/validation/dataset-schema";

const publishSchema = z.object({
  dialect: z.enum(["standard", "kansai"]).default("standard"),
  force: z.boolean().optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        english: z.string().min(1),
        speaker: z.enum(["A", "B"]).optional(),
        fields: translatedFieldsSchema,
      })
    )
    .min(1)
    .max(100),
});

/** Publish already-authored translations (imports / manual) to the cloud. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.supabaseUserId ?? null;

  if (ONLINE_FIRST_ENABLED && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = publishSchema.parse(await request.json());
    const batch = body.items.map((item) => {
      const scope = resolveTranslationScope(item.id, userId);
      return {
        legacySentenceId: item.id,
        english: item.english,
        dialect: body.dialect,
        fields: item.fields,
        scope,
        ownerUserId: scope === "user" ? userId : null,
        speaker: item.speaker === "B" ? ("B" as const) : ("A" as const),
        provenance: "import" as const,
        force: body.force === true,
      };
    });

    const result = await persistDurableTranslationBatch(batch);
    return NextResponse.json(
      {
        ok: result.ok,
        failed: result.failed,
        count: batch.length,
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
