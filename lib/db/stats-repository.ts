import type { AppStats, DailySnapshot, ModeSession, StudyMode } from "@/types/stats";
import { formatDateKey } from "@/lib/utils";
import { DEFAULT_STATS, getDB } from "./index";

const STATS_KEY = "main";

export async function getStats(): Promise<AppStats> {
  try {
    const db = await getDB();
    return (await db.get("stats", STATS_KEY)) ?? { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function saveStats(stats: AppStats): Promise<void> {
  const db = await getDB();
  await db.put("stats", stats, STATS_KEY);
}

export async function recordActiveDay(): Promise<void> {
  const today = formatDateKey();
  const stats = await getStats();
  if (!stats.activeDays.includes(today)) {
    await saveStats({ ...stats, activeDays: [...stats.activeDays, today] });
  }
}

export async function startModeSession(mode: StudyMode): Promise<string> {
  const id = crypto.randomUUID();
  const session: ModeSession = {
    id,
    mode,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: 0,
  };
  const stats = await getStats();
  await saveStats({ ...stats, modeSessions: [...stats.modeSessions, session] });
  await recordActiveDay();
  return id;
}

export async function endModeSession(sessionId: string): Promise<void> {
  const stats = await getStats();
  const sessions = stats.modeSessions.map((s) => {
    if (s.id !== sessionId || s.endedAt) return s;
    const endedAt = new Date().toISOString();
    const durationMs =
      new Date(endedAt).getTime() - new Date(s.startedAt).getTime();
    return { ...s, endedAt, durationMs };
  });
  await saveStats({ ...stats, modeSessions: sessions });
}

export async function recordDailySnapshot(snapshot: DailySnapshot): Promise<void> {
  const stats = await getStats();
  const filtered = stats.dailySnapshots.filter((s) => s.date !== snapshot.date);
  await saveStats({
    ...stats,
    dailySnapshots: [...filtered, snapshot].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  });
}

export async function recordMastery(
  sentenceId: string,
  daysToMastery: number
): Promise<void> {
  const stats = await getStats();
  const exists = stats.masteryEvents.some((e) => e.sentenceId === sentenceId);
  if (exists) return;
  await saveStats({
    ...stats,
    masteryEvents: [
      ...stats.masteryEvents,
      { sentenceId, masteredAt: new Date().toISOString(), daysToMastery },
    ],
  });
}
