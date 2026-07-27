import type { AdjustmentNotification } from "@paddle/paddle-node-sdk";
import { finalizeDowngradeToFree } from "@/lib/services/billing/subscription-service";
import { resolveUserIdForPaddleIds } from "@/lib/services/billing/paddle-user-resolve";

const REVOKE_ACTIONS = new Set([
  "refund",
  "chargeback",
  "chargeback_warning",
]);

/**
 * Refunds and chargebacks revoke paid access immediately.
 * Partial refunds on subscription payments also revoke (conservative — avoids abuse).
 */
export async function handlePaddleAdjustmentEvent(
  data: AdjustmentNotification
): Promise<void> {
  const action = String(data.action ?? "").toLowerCase();
  if (!REVOKE_ACTIONS.has(action)) return;

  const status = String(data.status ?? "").toLowerCase();
  if (action === "refund" && status !== "approved") return;

  const userId = await resolveUserIdForPaddleIds({
    customerId: data.customerId,
    subscriptionId: data.subscriptionId,
  });
  if (!userId) {
    console.warn("paddle adjustment: could not resolve userId", data.id);
    return;
  }

  const affectsSubscription =
    Boolean(data.subscriptionId) || String(data.type ?? "").toLowerCase() === "full";
  if (!affectsSubscription) return;

  await finalizeDowngradeToFree(userId);
}
