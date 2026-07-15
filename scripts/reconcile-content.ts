/**
 * Reconcile canonical English content and optionally retranslate stale rows.
 *
 * Usage:
 *   npm run reconcile-content
 *   npm run reconcile-content -- --retranslate-limit=50
 *   npm run reconcile-content -- --reconcile-only
 */

import {
  countStaleTranslations,
  processStaleTranslationsBatch,
  reconcileCanonicalContent,
} from "../lib/cloud/sentence-invalidation";

async function main() {
  const reconcileOnly = process.argv.includes("--reconcile-only");
  const limitArg = process.argv.find((a) => a.startsWith("--retranslate-limit="));
  const retranslateLimit = limitArg
    ? Math.min(100, Math.max(1, Number(limitArg.split("=")[1]) || 20))
    : 20;

  console.log("Reconciling canonical content…");
  const reconcile = await reconcileCanonicalContent();
  console.log(reconcile);

  if (reconcileOnly) {
    const stale = await countStaleTranslations();
    console.log(`Stale translations: ${stale}`);
    return;
  }

  console.log(`Retranslating up to ${retranslateLimit} stale rows…`);
  const retranslate = await processStaleTranslationsBatch(retranslateLimit);
  console.log(retranslate);

  const stale = await countStaleTranslations();
  console.log(`Remaining stale: ${stale}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
