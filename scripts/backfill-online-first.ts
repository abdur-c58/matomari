/**
 * Backfill online-first cloud tables from existing catalog + shared translations.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-online-first.ts --enqueue-tts
 */

import fs from "fs";
import path from "path";
import { contentFingerprint } from "../lib/cloud/content-fingerprint";
import { createAdminClient } from "../lib/supabase/admin";
import { fetchSharedTranslationsFromDb } from "../lib/supabase/shared-translations-data";
import { enqueueTtsJob } from "../lib/supabase/tts-jobs";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";
import type { TranslatedFields } from "../types/sentence";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "public", "premade-catalog.json");
const PATHWAY_PATH = path.join(ROOT, "public", "main-pathway.json");

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

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");
  const enqueueTts = process.argv.includes("--enqueue-tts");

  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin not configured");

  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  );

  let pathwaySentences: Array<{
    id: string;
    english: string;
    speaker?: "A" | "B";
  }> = [];
  if (fs.existsSync(PATHWAY_PATH)) {
    const pathway = JSON.parse(fs.readFileSync(PATHWAY_PATH, "utf8")) as {
      batches?: Array<{ sentences?: Array<{ id: string; english: string }> }>;
    };
    for (const batch of pathway.batches ?? []) {
      for (const s of batch.sentences ?? []) {
        pathwaySentences.push({ id: s.id, english: s.english });
      }
    }
  }

  const catalogSentences = Object.values(catalog.islands).flatMap((island) =>
    island.sentences.map((s) => ({
      id: s.id,
      english: s.english,
      speaker: s.speaker,
      source: "premade" as const,
    }))
  );

  const allSeeds = [
    ...catalogSentences,
    ...pathwaySentences.map((s) => ({
      ...s,
      source: "pathway" as const,
      speaker: undefined as "A" | "B" | undefined,
    })),
  ];

  // Deduplicate by legacy id
  const byId = new Map<string, (typeof allSeeds)[number]>();
  for (const s of allSeeds) byId.set(s.id, s);

  console.log(`Seeds: ${byId.size}`);
  console.log(`Dry run: ${dryRun}`);

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
  const legacyToUuid = new Map<string, string>();

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
  }
  console.log(`Canonical sentences upserted: ${sentenceUpserts}`);

  const shared = await fetchSharedTranslationsFromDb();
  const translations = shared?.translations ?? {};
  let translationUpserts = 0;
  let jobsEnqueued = 0;

  for (const [legacyId, dialects] of Object.entries(translations)) {
    const uuid = legacyToUuid.get(legacyId);
    if (!uuid && !dryRun) {
      // Create shell sentence if translation exists without catalog seed
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
    }
  }

  console.log(`Translations upserted: ${translationUpserts}`);
  if (enqueueTts) console.log(`TTS jobs enqueued: ${jobsEnqueued}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
