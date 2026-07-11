import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  frequencyToMinDays,
  type NotificationPreferences,
  type ReminderFrequency,
} from "@/lib/constants/notifications";
import { getDueReviewIds } from "@/lib/services/srs-service";
import { isDue } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants/branding";

export function normalizeNotificationPreferences(
  raw: Partial<NotificationPreferences> | undefined
): NotificationPreferences {
  const base = DEFAULT_NOTIFICATION_PREFERENCES;
  if (!raw) return { ...base, lastSent: { ...base.lastSent } };

  return {
    masterEnabled: raw.masterEnabled ?? base.masterEnabled,
    dailyStudy: {
      enabled: raw.dailyStudy?.enabled ?? base.dailyStudy.enabled,
      timeLocal: raw.dailyStudy?.timeLocal ?? base.dailyStudy.timeLocal,
    },
    reviewReminders: {
      enabled: raw.reviewReminders?.enabled ?? base.reviewReminders.enabled,
      frequency: raw.reviewReminders?.frequency ?? base.reviewReminders.frequency,
    },
    islandReminders: {
      enabled: raw.islandReminders?.enabled ?? base.islandReminders.enabled,
      islandKeys: raw.islandReminders?.islandKeys ?? base.islandReminders.islandKeys,
      frequency: raw.islandReminders?.frequency ?? base.islandReminders.frequency,
    },
    lastSent: {
      daily: raw.lastSent?.daily,
      review: raw.lastSent?.review,
      islands: { ...raw.lastSent?.islands },
    },
  };
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function canSendByFrequency(lastSent: string | undefined, frequency: ReminderFrequency): boolean {
  if (!lastSent) return true;
  const minDays = frequencyToMinDays(frequency);
  const last = new Date(`${lastSent}T12:00:00`);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return diffMs >= minDays * 24 * 60 * 60 * 1000;
}

function isPastLocalTime(timeLocal: string): boolean {
  const [h, m] = timeLocal.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return true;
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function formatIslandLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function getDueReviewsForIsland(
  progress: UserProgress,
  islandKey: string
): string[] {
  return Object.values(progress.sentences)
    .filter(
      (s) =>
        s.sourceType === "island" &&
        s.sourceKey === islandKey &&
        s.batchStatus === "retired" &&
        isDue(s.srsNextReview)
    )
    .map((s) => s.sentenceId);
}

export type PendingNotification = {
  tag: string;
  title: string;
  body: string;
  url: string;
  lastSentPatch: Partial<NotificationPreferences["lastSent"]>;
};

export function collectPendingNotifications(
  prefs: NotificationPreferences,
  progress: UserProgress,
  dataset: Dataset | null
): PendingNotification[] {
  if (!prefs.masterEnabled || !dataset) return [];

  const pending: PendingNotification[] = [];
  const today = todayKey();

  if (
    prefs.dailyStudy.enabled &&
    isPastLocalTime(prefs.dailyStudy.timeLocal) &&
    prefs.lastSent.daily !== today
  ) {
    pending.push({
      tag: "kotoshima-daily",
      title: `${APP_NAME} — daily study`,
      body: "Your daily Japanese session is ready. Open Kotoshima to keep your streak going.",
      url: "/",
      lastSentPatch: { daily: today },
    });
  }

  if (
    prefs.reviewReminders.enabled &&
    canSendByFrequency(prefs.lastSent.review, prefs.reviewReminders.frequency)
  ) {
    const dueCount = getDueReviewIds(progress.sentences).length;
    if (dueCount > 0) {
      pending.push({
        tag: "kotoshima-review",
        title: "Reviews due",
        body: `${dueCount} sentence${dueCount === 1 ? "" : "s"} ready for spaced repetition review.`,
        url: "/recall",
        lastSentPatch: { review: today },
      });
    }
  }

  if (prefs.islandReminders.enabled && prefs.islandReminders.islandKeys.length > 0) {
    for (const islandKey of prefs.islandReminders.islandKeys) {
      if (!dataset.islands[islandKey]) continue;
      const lastIsland = prefs.lastSent.islands?.[islandKey];
      if (!canSendByFrequency(lastIsland, prefs.islandReminders.frequency)) continue;

      const dueCount = getDueReviewsForIsland(progress, islandKey).length;
      if (dueCount === 0) continue;

      const label = formatIslandLabel(islandKey);
      pending.push({
        tag: `kotoshima-island-${islandKey}`,
        title: `${label} island`,
        body: `${dueCount} review${dueCount === 1 ? "" : "s"} waiting in your ${label} island.`,
        url: `/batch?source=island`,
        lastSentPatch: {
          islands: { ...(prefs.lastSent.islands ?? {}), [islandKey]: today },
        },
      });
    }
  }

  return pending;
}

export async function showNotification(payload: PendingNotification): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url },
  };

  const registration = await registerNotificationServiceWorker();
  if (registration?.showNotification) {
    await registration.showNotification(payload.title, options);
    return;
  }

  new Notification(payload.title, options);
}

export function mergeLastSent(
  current: NotificationPreferences["lastSent"],
  patch: Partial<NotificationPreferences["lastSent"]>
): NotificationPreferences["lastSent"] {
  return {
    daily: patch.daily ?? current.daily,
    review: patch.review ?? current.review,
    islands: { ...current.islands, ...patch.islands },
  };
}
