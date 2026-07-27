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
  if (prefs.sceneReminders.enabled && prefs.sceneReminders.sceneKeys.length > 0) {
    parts.push(
      `${prefs.sceneReminders.sceneKeys.length} scene${prefs.sceneReminders.sceneKeys.length === 1 ? "" : "s"}`
    );
  }

  return parts.length > 0 ? parts.join(" · ") : "Notifications on — no reminders selected";
}
