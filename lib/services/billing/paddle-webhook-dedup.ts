import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns true when this event should be processed (first delivery).
 * Returns false when the event_id was already handled (duplicate webhook).
 */
export async function claimPaddleWebhookEvent(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return true;

  const { error } = await supabase.from("paddle_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  console.warn("paddle webhook dedup insert failed:", error.message);
  return true;
}

/** Remove events older than 90 days (cron maintenance). */
export async function prunePaddleWebhookEvents(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("paddle_webhook_events")
    .delete()
    .lt("processed_at", cutoff)
    .select("event_id");

  if (error) {
    console.warn("paddle webhook prune failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
