export type ReminderFrequency = "daily" | "every_2_days" | "weekly";

export interface NotificationLastSent {
  daily?: string;
  review?: string;
  scenes?: Record<string, string>;
}

export interface NotificationPreferences {
  /** User wants notifications (requires browser permission). */
  masterEnabled: boolean;
  dailyStudy: {
    enabled: boolean;
    /** Local time HH:mm (24h). */
    timeLocal: string;
  };
  reviewReminders: {
    enabled: boolean;
    frequency: ReminderFrequency;
  };
  sceneReminders: {
    enabled: boolean;
    sceneKeys: string[];
    frequency: ReminderFrequency;
  };
  lastSent: NotificationLastSent;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  masterEnabled: false,
  dailyStudy: {
    enabled: false,
    timeLocal: "09:00",
  },
  reviewReminders: {
    enabled: false,
    frequency: "daily",
  },
  sceneReminders: {
    enabled: false,
    sceneKeys: [],
    frequency: "every_2_days",
  },
  lastSent: {},
};

export const REMINDER_FREQUENCY_OPTIONS: {
  value: ReminderFrequency;
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "At most once per day" },
  {
    value: "every_2_days",
    label: "Every 2 days",
    description: "Skip a day between reminders",
  },
  { value: "weekly", label: "Weekly", description: "Once per week at most" },
];

export function frequencyToMinDays(frequency: ReminderFrequency): number {
  switch (frequency) {
    case "daily":
      return 1;
    case "every_2_days":
      return 2;
    case "weekly":
      return 7;
  }
}
