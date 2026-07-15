import { generateServerAudio } from "@/lib/audio/generate-audio";
import { getSpokenScriptFromFields } from "@/lib/audio/tts-text";
import { TtsQuotaError } from "@/lib/audio/tts-errors";
import type { Dialect } from "@/lib/constants/dialect";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimTtsJobs,
  completeTtsJob,
  failTtsJob,
  type TtsJobRow,
} from "@/lib/supabase/tts-jobs";
import type { TranslatedFields } from "@/types/sentence";

async function loadTranslationFields(
  job: TtsJobRow
): Promise<TranslatedFields | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  if (job.scope === "user" && job.user_sentence_id) {
    const { data } = await supabase
      .from("user_sentence_translations")
      .select("fields")
      .eq("sentence_id", job.user_sentence_id)
      .eq("dialect", job.dialect)
      .maybeSingle();
    return (data?.fields as TranslatedFields | undefined) ?? null;
  }

  if (job.canonical_sentence_id) {
    const { data } = await supabase
      .from("canonical_sentence_translations")
      .select("fields")
      .eq("sentence_id", job.canonical_sentence_id)
      .eq("dialect", job.dialect)
      .maybeSingle();
    if (data?.fields) return data.fields as TranslatedFields;
  }

  // Legacy fallback
  const { data: legacy } = await supabase
    .from("shared_sentence_translations")
    .select("translations")
    .eq("sentence_id", job.legacy_sentence_id)
    .maybeSingle();
  const fields = legacy?.translations?.[job.dialect as Dialect] as
    | TranslatedFields
    | undefined;
  return fields ?? null;
}

async function processJob(job: TtsJobRow): Promise<"ok" | "quota" | "fail"> {
  try {
    const fields = await loadTranslationFields(job);
    if (!fields?.japanese?.trim()) {
      await failTtsJob(
        job.id,
        job.attempts,
        job.max_attempts,
        "Missing translation fields for TTS"
      );
      return "fail";
    }

    const spoken =
      job.spoken_script?.trim() ||
      getSpokenScriptFromFields(
        {
          japanese: fields.japanese,
          reading: fields.reading,
          phonetic_reading: fields.phonetic_reading,
          placeholders: fields.placeholders,
        },
        { dialect: job.dialect as Dialect }
      );

    if (!spoken) {
      await failTtsJob(
        job.id,
        job.attempts,
        job.max_attempts,
        "Could not build spoken script"
      );
      return "fail";
    }

    const { hash } = await generateServerAudio(spoken, job.legacy_sentence_id, {
      dialect: job.dialect as Dialect,
      speaker: job.speaker === "B" ? "B" : "A",
      scope: job.scope,
      ownerUserId: job.owner_user_id,
      canonicalSentenceId: job.canonical_sentence_id,
      userSentenceId: job.user_sentence_id,
    });

    await completeTtsJob(job.id, hash);
    return "ok";
  } catch (e) {
    if (e instanceof TtsQuotaError) {
      await failTtsJob(
        job.id,
        job.attempts,
        job.max_attempts,
        e.message,
        { quota: true }
      );
      return "quota";
    }
    await failTtsJob(
      job.id,
      job.attempts,
      job.max_attempts,
      e instanceof Error ? e.message : "TTS worker error"
    );
    return "fail";
  }
}

export type TtsWorkerRunResult = {
  claimed: number;
  completed: number;
  failed: number;
  quotaExceeded: boolean;
};

export async function runTtsWorkerBatch(
  limit = 8
): Promise<TtsWorkerRunResult> {
  const leaseOwner = `worker-${process.pid}-${Date.now()}`;
  const jobs = await claimTtsJobs(limit, leaseOwner);
  const result: TtsWorkerRunResult = {
    claimed: jobs.length,
    completed: 0,
    failed: 0,
    quotaExceeded: false,
  };

  for (const job of jobs) {
    const outcome = await processJob(job);
    if (outcome === "ok") result.completed++;
    else if (outcome === "quota") {
      result.quotaExceeded = true;
      result.failed++;
      break;
    } else result.failed++;
  }

  return result;
}
