/**
 * Verify adaptive SRS retirement scheduling.
 *
 * Usage: npm run verify-srs
 */

import type { SentenceProgress } from "../types/progress";
import { formatDateKey, isDue } from "../lib/utils";
import {
  SRS_INTERVALS_DAYS,
  getDueReviewIds,
  onCorrectRecall,
  onIncorrectRecall,
  repairImmediateRetirementSchedule,
  scheduleRetirementSrs,
} from "../lib/services/srs-service";
import { retireSentence } from "../lib/services/batch-service";
import { bulkApplySentenceRatings } from "../lib/services/bulk-rating-service";
import { normalizeUserProgress } from "../lib/progress/dialect-progress";
import type { Dataset } from "../types/sentence";
import type { UserProgress } from "../types/progress";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../lib/constants/notifications";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function daysUntil(dateStr: string): number {
  const today = new Date(`${formatDateKey()}T12:00:00`);
  const target = new Date(`${dateStr}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function makeCorrectHistory(count: number): SentenceProgress["recallHistory"] {
  return Array.from({ length: count }, () => ({
    date: new Date().toISOString(),
    correct: true,
  }));
}

function baseSp(overrides: Partial<SentenceProgress> = {}): SentenceProgress {
  return {
    sentenceId: "s1",
    rating: null,
    recallHistory: [],
    meaningConfirmed: true,
    batchStatus: "active",
    srsNextReview: null,
    srsIntervalIndex: 0,
    retiredAt: null,
    firstSeenAt: "2026-01-01",
    masteredAt: null,
    sourceType: "pathway",
    sourceKey: "1",
    ...overrides,
  };
}

function minimalDataset(sentenceId = "s1"): Dataset {
  return {
    main_pathway: {
      description: "Test pathway",
      batches: [
        {
          batch_number: 1,
          batch_title: "Test",
          target_difficulty_range: [1, 1],
          sentences: [
            {
              id: sentenceId,
              english: "Hello",
              register: "casual",
              difficulty: 1,
              category: "test",
              subtopic: "test",
              tags: [],
              translated: false,
            },
          ],
        },
      ],
    },
    islands: {},
  };
}

function minimalProgress(sentenceId = "s1"): UserProgress {
  return {
    settings: {
      batchSize: 5,
      dialect: "standard",
      dialectChosen: true,
      showKansaiDialect: false,
      kansaiAsPrimary: false,
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, lastSent: {} },
    },
    sentences: {
      [sentenceId]: baseSp({ sentenceId, batchStatus: "active" }),
    },
    batchConfig: {
      sourceType: "pathway",
      pathwayBatchNumber: 1,
      islandKey: null,
      subtopic: null,
      batchSize: 5,
      activeSentenceIds: [sentenceId],
    },
    completedPathwayBatches: [],
    completedIslands: [],
  };
}

console.log("\n=== SRS retirement scheduling ===\n");

{
  const sp = baseSp({ recallHistory: makeCorrectHistory(5) });
  const srs = scheduleRetirementSrs(sp, 5);
  assert(srs.srsNextReview != null && !isDue(srs.srsNextReview), "5★ strong recall is not due today");
  assert(
    srs.srsNextReview != null && daysUntil(srs.srsNextReview) >= 7,
    "5★ strong recall schedules ≥7 days out"
  );
  assert(srs.srsIntervalIndex === 3, "5★ strong recall uses interval index 3");
}

{
  const sp = baseSp({ recallHistory: makeCorrectHistory(3) });
  const srs = scheduleRetirementSrs(sp, 4);
  assert(srs.srsNextReview != null && !isDue(srs.srsNextReview), "4★ moderate recall is not due today");
  assert(
    srs.srsNextReview != null && daysUntil(srs.srsNextReview) >= 3,
    "4★ moderate recall schedules ≥3 days out"
  );
}

{
  const sp = baseSp();
  const srs = scheduleRetirementSrs(sp, 5);
  assert(srs.srsNextReview != null && !isDue(srs.srsNextReview), "library 5★ (no history) is not due today");
  assert(
    srs.srsNextReview != null && daysUntil(srs.srsNextReview) === SRS_INTERVALS_DAYS[1],
    "library 5★ (no history) schedules 3 days out"
  );
}

{
  const sp = baseSp({ recallHistory: makeCorrectHistory(1) });
  const srs = scheduleRetirementSrs(sp, 5);
  assert(srs.srsNextReview != null && srs.srsNextReview > formatDateKey(), "same-day correct recall schedules after today");
}

console.log("\n=== Review mode SRS preservation ===\n");

{
  let sp = baseSp({
    batchStatus: "retired",
    rating: 5,
    retiredAt: formatDateKey(),
    srsIntervalIndex: 1,
    srsNextReview: formatDateKey(),
  });
  sp = onCorrectRecall(sp);
  const advancedReview = sp.srsNextReview;
  const advancedIndex = sp.srsIntervalIndex;

  const dataset = minimalDataset();
  const progress = minimalProgress();
  progress.sentences.s1 = sp;
  progress.batchConfig!.activeSentenceIds = [];

  const afterRetire = retireSentence(dataset, progress, "s1");
  const final = afterRetire.sentences.s1;

  assert(final.srsNextReview === advancedReview, "retireSentence preserves SRS on already-retired sentence");
  assert(final.srsIntervalIndex === advancedIndex, "retireSentence preserves interval index on already-retired sentence");
}

console.log("\n=== Due review pool ===\n");

{
  const sp = baseSp({ recallHistory: makeCorrectHistory(5), rating: 5 });
  const srs = scheduleRetirementSrs(sp, 5);
  const retired = {
    ...sp,
    batchStatus: "retired" as const,
    retiredAt: formatDateKey(),
    ...srs,
  };
  const due = getDueReviewIds({ s1: retired });
  assert(!due.includes("s1"), "freshly retired 5★ sentence is excluded from due review pool today");
}

console.log("\n=== Incorrect recall reset ===\n");

{
  const sp = baseSp({
    batchStatus: "retired",
    srsIntervalIndex: 4,
    srsNextReview: formatDateKey(),
  });
  const reset = onIncorrectRecall(sp);
  assert(reset.srsIntervalIndex === 0, "incorrect recall resets interval index to 0");
  assert(
    reset.srsNextReview != null && daysUntil(reset.srsNextReview) === 1,
    "incorrect recall schedules 1 day out"
  );
}

console.log("\n=== Legacy migration repair ===\n");

{
  const today = formatDateKey();
  const broken = baseSp({
    batchStatus: "retired",
    rating: 5,
    retiredAt: today,
    srsNextReview: today,
    srsIntervalIndex: 0,
    recallHistory: makeCorrectHistory(5),
  });
  const repaired = repairImmediateRetirementSchedule(broken);
  assert(
    repaired.srsNextReview != null && repaired.srsNextReview > today,
    "repairImmediateRetirementSchedule moves immediate review to the future"
  );
}

console.log("\n=== Flow integration (bulk rating) ===\n");

{
  const dataset = minimalDataset("bulk-s1");
  const progress = minimalProgress("bulk-s1");
  progress.sentences["bulk-s1"] = baseSp({ sentenceId: "bulk-s1", batchStatus: "active" });
  progress.batchConfig!.activeSentenceIds = ["bulk-s1"];

  const result = bulkApplySentenceRatings(dataset, progress, ["bulk-s1"], 5);
  const sp = result.progress.sentences["bulk-s1"];

  assert(sp.batchStatus === "retired", "bulk 5★ retires sentence");
  assert(sp.srsNextReview != null && !isDue(sp.srsNextReview), "bulk 5★ is not due for review today");
  assert(
    sp.srsNextReview != null && daysUntil(sp.srsNextReview) >= 3,
    "bulk 5★ schedules review at least 3 days out"
  );
}

console.log("\n=== Flow integration (active recall retirement) ===\n");

{
  const dataset = minimalDataset("recall-s1");
  const progress = minimalProgress("recall-s1");
  progress.sentences["recall-s1"] = baseSp({
    sentenceId: "recall-s1",
    batchStatus: "active",
    rating: 5,
    recallHistory: makeCorrectHistory(5),
  });
  progress.batchConfig!.activeSentenceIds = ["recall-s1"];

  const after = retireSentence(dataset, progress, "recall-s1");
  const sp = after.sentences["recall-s1"];

  assert(sp.batchStatus === "retired", "recall retirement marks sentence retired");
  assert(!after.batchConfig!.activeSentenceIds.includes("recall-s1"), "recall retirement removes sentence from active batch");
  assert(sp.srsNextReview != null && !isDue(sp.srsNextReview), "recall retirement is not due for review today");
}

console.log("\n=== Progress load migration ===\n");

{
  const today = formatDateKey();
  const progress = minimalProgress("migrate-s1");
  progress.sentences["migrate-s1"] = baseSp({
    sentenceId: "migrate-s1",
    batchStatus: "retired",
    rating: 5,
    retiredAt: today,
    srsNextReview: today,
    srsIntervalIndex: 0,
    recallHistory: makeCorrectHistory(5),
  });

  const normalized = normalizeUserProgress(progress);
  const sp = normalized.sentences["migrate-s1"];

  assert(
    sp.srsNextReview != null && sp.srsNextReview > today,
    "normalizeUserProgress repairs immediate retirement schedules on load"
  );
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
