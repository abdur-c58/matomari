"use client";

import { Bell, BellOff } from "lucide-react";
import type { Dataset } from "@/types/sentence";
import type { NotificationPreferences } from "@/lib/constants/notifications";
import { REMINDER_FREQUENCY_OPTIONS } from "@/lib/constants/notifications";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  isNotificationSupported,
  requestNotificationPermission,
} from "@/lib/notifications/notification-service";
import { toast } from "sonner";

function formatSceneLabel(key: string): string {
  return key.replace(/_/g, " ");
}

export function NotificationPreferencesSection({
  notifications,
  onChange,
  dataset,
}: {
  notifications: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
  dataset: Dataset | null;
}) {
  const supported = isNotificationSupported();
  const sceneKeys = Object.keys(dataset?.scenes ?? {});

  const patch = (partial: Partial<NotificationPreferences>) =>
    onChange({ ...notifications, ...partial });

  const handleMasterToggle = async (enabled: boolean) => {
    if (!supported) {
      toast.error("Notifications are not supported in this browser");
      return;
    }
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        patch({ masterEnabled: false });
        return;
      }
      toast.success("Notifications enabled");
      patch({ masterEnabled: true });
      return;
    }
    patch({ masterEnabled: false });
  };

  const toggleScene = (key: string) => {
    const selected = new Set(notifications.sceneReminders.sceneKeys);
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    patch({
      sceneReminders: {
        ...notifications.sceneReminders,
        sceneKeys: [...selected],
      },
    });
  };

  if (!supported) {
    return (
      <p className="text-sm text-muted">
        Notifications are not available in this browser. Add Matomari to your home screen on
        mobile for the best experience.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {notifications.masterEnabled ? (
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          ) : (
            <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
          )}
          <div>
            <Label className="text-base">Enable notifications</Label>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Reminders for daily study and spaced repetition reviews. Works best when Matomari
              is installed as an app.
            </p>
          </div>
        </div>
        <Switch checked={notifications.masterEnabled} onCheckedChange={handleMasterToggle} />
      </div>

      {notifications.masterEnabled && (
        <>
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Daily study reminder</p>
                <p className="text-sm text-muted">A nudge to open Matomari each day</p>
              </div>
              <Switch
                checked={notifications.dailyStudy.enabled}
                onCheckedChange={(enabled) =>
                  patch({ dailyStudy: { ...notifications.dailyStudy, enabled } })
                }
              />
            </div>
            {notifications.dailyStudy.enabled && (
              <div>
                <Label className="text-xs text-muted">Reminder time</Label>
                <Input
                  type="time"
                  className="mt-1.5"
                  value={notifications.dailyStudy.timeLocal}
                  onChange={(e) =>
                    patch({
                      dailyStudy: {
                        ...notifications.dailyStudy,
                        timeLocal: e.target.value || "09:00",
                      },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Review reminders</p>
                <p className="text-sm text-muted">
                  When spaced repetition reviews are due across your library
                </p>
              </div>
              <Switch
                checked={notifications.reviewReminders.enabled}
                onCheckedChange={(enabled) =>
                  patch({
                    reviewReminders: { ...notifications.reviewReminders, enabled },
                  })
                }
              />
            </div>
            {notifications.reviewReminders.enabled && (
              <div>
                <Label className="text-xs text-muted">Frequency</Label>
                <Select
                  value={notifications.reviewReminders.frequency}
                  onValueChange={(frequency) =>
                    patch({
                      reviewReminders: {
                        ...notifications.reviewReminders,
                        frequency: frequency as NotificationPreferences["reviewReminders"]["frequency"],
                      },
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Scene review reminders</p>
                <p className="text-sm text-muted">
                  Optional reminders for reviews due in specific scenes
                </p>
              </div>
              <Switch
                checked={notifications.sceneReminders.enabled}
                onCheckedChange={(enabled) =>
                  patch({
                    sceneReminders: { ...notifications.sceneReminders, enabled },
                  })
                }
              />
            </div>
            {notifications.sceneReminders.enabled && (
              <>
                <div>
                  <Label className="text-xs text-muted">Frequency</Label>
                  <Select
                    value={notifications.sceneReminders.frequency}
                    onValueChange={(frequency) =>
                      patch({
                        sceneReminders: {
                          ...notifications.sceneReminders,
                          frequency: frequency as NotificationPreferences["sceneReminders"]["frequency"],
                        },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sceneKeys.length === 0 ? (
                  <p className="text-sm text-muted">
                    Create or import scenes in Study to choose which ones get reminders.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted">Scenes to notify</Label>
                    {sceneKeys.map((key) => {
                      const selected = notifications.sceneReminders.sceneKeys.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleScene(key)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                            selected
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:border-foreground/30"
                          )}
                        >
                          <span className="font-medium capitalize">{formatSceneLabel(key)}</span>
                          <span className="text-xs text-muted">
                            {selected ? "On" : "Off"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
