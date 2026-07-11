import type { NotificationPreferences } from "@/lib/constants/notifications";

export function summarizeNotificationPreferences(prefs: NotificationPreferences): string {
  if (!prefs.masterEnabled) return "Notifications off";

  const parts: string[] = [];
  if (prefs.dailyStudy.enabled) {
    parts.push(`Daily at ${prefs.dailyStudy.timeLocal}`);
  }
  if (prefs.reviewReminders.enabled) {
    parts.push("Review reminders");
  }
  if (prefs.islandReminders.enabled && prefs.islandReminders.islandKeys.length > 0) {
    parts.push(
      `${prefs.islandReminders.islandKeys.length} island${prefs.islandReminders.islandKeys.length === 1 ? "" : "s"}`
    );
  }

  return parts.length > 0 ? parts.join(" · ") : "Notifications on — no reminders selected";
}
