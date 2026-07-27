import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminGrantedSubscription } from "@/lib/services/billing/admin-subscription";
import { paddleBillingProvider } from "@/lib/services/billing";
import { getUserSubscriptionAdmin } from "@/lib/services/billing/subscription-service";

type ReconcileResult = {
  scanned: number;
  synced: number;
  errors: string[];
  prunedWebhookEvents: number;
};

/**
 * Backstop when a webhook is dropped: re-fetch Paddle subscriptions and sync local rows.
 */
export async function reconcilePaddleSubscriptions(): Promise<ReconcileResult> {
  const supabase = createAdminClient();
  const result: ReconcileResult = {
    scanned: 0,
    synced: 0,
    errors: [],
    prunedWebhookEvents: 0,
  };

  if (!supabase) {
    result.errors.push("Database unavailable");
    return result;
  }

  const { data: rows, error } = await supabase
    .from("user_subscriptions")
    .select("user_id, paddle_subscription_id")
    .not("paddle_subscription_id", "is", null)
    .in("status", ["active", "canceled", "past_due"]);

  if (error || !rows) {
    result.errors.push(error?.message ?? "Failed to list subscriptions");
    return result;
  }

  for (const row of rows) {
    const subId = row.paddle_subscription_id as string | null;
    const userId = row.user_id as string;
    if (!subId || subId.startsWith("pad_sub_admin_")) continue;

    result.scanned += 1;
    try {
      const local = await getUserSubscriptionAdmin(userId);
      if (local && isAdminGrantedSubscription(local)) continue;

      await paddleBillingProvider.syncSubscriptionFromPaddleRemote({
        userId,
        subscriptionId: subId,
      });
      result.synced += 1;
    } catch (err) {
      result.errors.push(
        `${userId}: ${err instanceof Error ? err.message : "sync failed"}`
      );
    }
  }

  const { prunePaddleWebhookEvents } = await import(
    "@/lib/services/billing/paddle-webhook-dedup"
  );
  result.prunedWebhookEvents = await prunePaddleWebhookEvents();

  return result;
}
