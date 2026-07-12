import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { AudioCacheEntry } from "@/types/audio";
import type { SyncQueueItem } from "@/lib/repositories/types";

interface LanguageDB extends DBSchema {
  dataset: {
    key: string;
    value: { id: string; data: Dataset; importedAt: string; updatedAt: string };
  };
  progress: {
    key: string;
    value: UserProgress & { updatedAt?: string };
  };
  stats: {
    key: string;
    value: AppStats & { updatedAt?: string };
  };
  audioCache: {
    key: string;
    value: AudioCacheEntry;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = "japanese-learning";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<LanguageDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LanguageDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("dataset")) {
          db.createObjectStore("dataset");
        }
        if (!db.objectStoreNames.contains("progress")) {
          db.createObjectStore("progress");
        }
        if (!db.objectStoreNames.contains("stats")) {
          db.createObjectStore("stats");
        }
        if (!db.objectStoreNames.contains("audioCache")) {
          db.createObjectStore("audioCache");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("syncQueue")) {
            db.createObjectStore("syncQueue");
          }
          if (!db.objectStoreNames.contains("meta")) {
            db.createObjectStore("meta");
          }
        }
      },
    });
  }
  return dbPromise;
}

import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";
import { emptyDialectStudyProgress } from "@/lib/progress/dialect-progress";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/constants/notifications";

export const DEFAULT_PROGRESS: UserProgress = {
  byDialect: {
    standard: emptyDialectStudyProgress(),
    kansai: emptyDialectStudyProgress(),
  },
  sentences: {},
  batchConfig: null,
  settings: {
    batchSize: 25,
    dialect: DEFAULT_DIALECT,
    dialectChosen: false,
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, lastSent: {} },
  },
  completedPathwayBatches: [],
  completedIslands: [],
};

export const DEFAULT_STATS: AppStats = {
  modeSessions: [],
  dailySnapshots: [],
  masteryEvents: [],
  activeDays: [],
};
