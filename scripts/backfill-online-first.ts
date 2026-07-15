/**
 * Backfill online-first cloud tables from existing catalog + shared translations.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts --translations-only
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts --enqueue-tts
 */

import fs from "fs";
import path from "path";
import { contentFingerprint } from "../lib/cloud/content-fingerprint";
import { loadContentSeedsFromFiles, seedToMetadata } from "../lib/cloud/content-seeds";
import { createAdminClient } from "../lib/supabase/admin";
import { fetchSharedTranslationsFromDb } from "../lib/supabase/shared-translations-data";
import { enqueueTtsJob } from "../lib/supabase/tts-jobs";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { TranslatedFields } from "../types/sentence";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

async function loadExistingSentenceMap(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("canonical_sentences")
      .select("id, legacy_id")
      .order("legacy_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      map.set(row.legacy_id as string, row.id as string);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");
  const enqueueTts = process.argv.includes("--enqueue-tts");
  const translationsOnly = process.argv.includes("--translations-only");

  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin not configured");

  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );

  const allSeeds = loadContentSeedsFromFiles().map((seed) => ({
    id: seed.legacyId,
    english: seed.english,
    speaker: seed.speaker,
    source: seed.source === "pathway" ? ("pathway" as const) : ("premade" as const),
    metadata: seedToMetadata(seed),
  }));

  const byId = new Map(allSeeds.map((s) => [s.id, s]));

  console.log(`Seeds: ${byId.size}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Translations only: ${translationsOnly}`);

  const legacyToUuid = new Map<string, string>();

  if (translationsOnly) {
    const existing = await loadExistingSentenceMap(supabase);
    for (const [legacyId, uuid] of existing) {
      legacyToUuid.set(legacyId, uuid);
    }
    console.log(`Loaded existing canonical sentences: ${legacyToUuid.size}`);
  } else {
    // Upsert premade catalog row
    if (!dryRun) {
      const { error } = await supabase.from("shared_premade_catalog").upsert({
        id: "main",
        data: catalog,
        release_version: 1,
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn("premade catalog upsert:", error.message);
      else console.log("Upserted shared_premade_catalog");
    } else {
      console.log("[dry-run] would upsert shared_premade_catalog");
    }

    let sentenceUpserts = 0;
    for (const seed of byId.values()) {
      if (dryRun) {
        sentenceUpserts++;
        continue;
      }
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("canonical_sentences")
        .upsert(
          {
            legacy_id: seed.id,
            english: seed.english,
            content_fingerprint: contentFingerprint(seed.english),
            source: seed.source,
            speaker: seed.speaker === "B" ? "B" : seed.speaker === "A" ? "A" : null,
            metadata: seed.metadata,
            updated_at: now,
          },
          { onConflict: "legacy_id" }
        )
        .select("id")
        .single();
      if (error) {
        console.warn(`sentence ${seed.id}: ${error.message}`);
        continue;
      }
      legacyToUuid.set(seed.id, data.id as string);
      sentenceUpserts++;
      if (sentenceUpserts % 500 === 0) {
        console.log(`… sentences ${sentenceUpserts}/${byId.size}`);
      }
    }
    console.log(`Canonical sentences upserted: ${sentenceUpserts}`);
  }

  const shared = await fetchSharedTranslationsFromDb();
  const translations = shared?.translations ?? {};
  console.log(`Shared translation rows fetched: ${Object.keys(translations).length}`);

  let translationUpserts = 0;
  let skippedOrphan = 0;
  let jobsEnqueued = 0;

  for (const [legacyId, dialects] of Object.entries(translations)) {
    const uuid = legacyToUuid.get(legacyId);
    if (!uuid && !dryRun) {
      skippedOrphan++;
      continue;
    }
    for (const dialect of ["standard", "kansai"] as const) {
      const fields = dialects[dialect] as TranslatedFields | undefined;
      if (!fields?.japanese?.trim()) continue;
      translationUpserts++;
      if (dryRun) continue;

      const sentenceId = legacyToUuid.get(legacyId);
      if (!sentenceId) continue;

      const { error } = await supabase
        .from("canonical_sentence_translations")
        .upsert(
          {
            sentence_id: sentenceId,
            dialect,
            fields,
            revision: 1,
            provenance: "backfill",
            status: "ready",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "sentence_id,dialect" }
        );
      if (error) {
        console.warn(`translation ${legacyId}/${dialect}: ${error.message}`);
        continue;
      }

      if (enqueueTts) {
        const speaker =
          byId.get(legacyId)?.speaker === "B" ? ("B" as const) : ("A" as const);
        const job = await enqueueTtsJob({
          legacySentenceId: legacyId,
          dialect,
          speaker,
          scope: "canonical",
          canonicalSentenceId: sentenceId,
        });
        if (job.ok) jobsEnqueued++;
      }

      if (translationUpserts % 500 === 0) {
        console.log(`… translations ${translationUpserts}`);
      }
    }
  }

  console.log(`Translations upserted: ${translationUpserts}`);
  if (skippedOrphan > 0) {
    console.log(`Skipped orphan shared rows (no matching sentence): ${skippedOrphan}`);
  }
  if (enqueueTts) console.log(`TTS jobs enqueued: ${jobsEnqueued}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
