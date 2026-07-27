import type { EventEntity } from "@paddle/paddle-node-sdk";
import { EventName } from "@paddle/paddle-node-sdk";
import type { BillingProvider } from "@/lib/services/billing/billing-provider";
import type {
  BillingWebhookEvent,
  CancelSubscriptionResult,
  CheckoutSession,
} from "@/lib/services/billing/types";
import {
  paddlePriceIdForPlan,
  tierFromPaddlePriceId,
  type BillingInterval,
} from "@/lib/constants/pricing";
import { hasMinTier, type SubscriptionTierId } from "@/lib/constants/entitlements";
import {
  finalizeDowngradeToFree,
  getUserSubscriptionAdmin,
  upsertUserSubscriptionAdmin,
  type SubscriptionStatus,
} from "@/lib/services/billing/subscription-service";
import { getPaddle } from "@/lib/services/billing/paddle-client";

function normalizePaidPlan(plan?: string | null): "plus" | "pro" {
  return plan === "pro" ? "pro" : "plus";
}

function normalizeInterval(interval?: string | null): BillingInterval {
  return interval === "annual" ? "annual" : "monthly";
}

function mapPaddleStatus(
  status: string | null | undefined
): SubscriptionStatus {
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "paused") return "canceled";
  return "active";
}

function customDataString(
  data: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  if (!data) return null;
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function priceIdFromSubscriptionItems(
  items: Array<{ price?: { id?: string } | null }> | null | undefined
): string | null {
  const price = items?.[0]?.price;
  return price?.id ?? null;
}

function tierFromSubscriptionLike(sub: {
  items?: Array<{ price?: { id?: string } | null }> | null;
  customData?: Record<string, unknown> | null;
}): SubscriptionTierId {
  const fromPrice = tierFromPaddlePriceId(
    priceIdFromSubscriptionItems(sub.items ?? undefined)
  );
  if (fromPrice) return fromPrice;
  const plan = customDataString(sub.customData ?? undefined, "plan");
  if (plan === "pro" || plan === "plus") return plan;
  return "plus";
}

function periodEndIso(
  endsAt: string | null | undefined,
  nextBilledAt: string | null | undefined
): string | null {
  return endsAt ?? nextBilledAt ?? null;
}

function cancelScheduled(sub: {
  scheduledChange?: { action?: string | null } | null;
}): boolean {
  return sub.scheduledChange?.action === "cancel";
}

async function ensurePaddleCustomer(params: {
  userId: string;
  email?: string | null;
}): Promise<string> {
  const paddle = getPaddle();
  const existing = await getUserSubscriptionAdmin(params.userId);
  if (existing?.paddleCustomerId) {
    return existing.paddleCustomerId;
  }

  if (params.email) {
    const list = paddle.customers.list({ email: [params.email] });
    for await (const customer of list) {
      await upsertUserSubscriptionAdmin({
        userId: params.userId,
        tier: existing?.tier ?? "free",
        status: existing?.status ?? "active",
        paddleCustomerId: customer.id,
        paddleSubscriptionId: existing?.paddleSubscriptionId ?? null,
        currentPeriodEnd: existing?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: existing?.cancelAtPeriodEnd ?? false,
        preserveCustomerId: false,
      });
      return customer.id;
    }
  }

  if (!params.email?.trim()) {
    throw new Error("Email is required to create a Paddle customer");
  }

  const created = await paddle.customers.create({
    email: params.email.trim(),
    customData: { userId: params.userId },
  });

  await upsertUserSubscriptionAdmin({
    userId: params.userId,
    tier: existing?.tier ?? "free",
    status: existing?.status ?? "active",
    paddleCustomerId: created.id,
    paddleSubscriptionId: existing?.paddleSubscriptionId ?? null,
    currentPeriodEnd: existing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: existing?.cancelAtPeriodEnd ?? false,
  });

  return created.id;
}

async function syncSubscriptionRow(params: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  clearUnlockKeys?: boolean;
}) {
  await upsertUserSubscriptionAdmin({
    userId: params.userId,
    tier: params.tier,
    status: params.status,
    paddleCustomerId: params.customerId,
    paddleSubscriptionId: params.subscriptionId,
    currentPeriodEnd: params.currentPeriodEnd,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    ...(params.clearUnlockKeys ? { unlockedSceneKeys: [] } : {}),
  });
}

export class PaddleBillingProvider implements BillingProvider {
  async createCheckoutSession(params: {
    userId: string;
    email?: string | null;
    successUrl: string;
    cancelUrl: string;
    plan?: "plus" | "pro";
    interval?: BillingInterval;
  }): Promise<CheckoutSession> {
    const paddle = getPaddle();
    const plan = normalizePaidPlan(params.plan);
    const interval = normalizeInterval(params.interval);
    const priceId = paddlePriceIdForPlan(plan, interval);
    const customerId = await ensurePaddleCustomer({
      userId: params.userId,
      email: params.email,
    });

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customerId,
      currencyCode: "USD",
      collectionMode: "automatic",
      customData: {
        userId: params.userId,
        plan,
        interval,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      },
    });

    const url = transaction.checkout?.url;
    if (!url) {
      throw new Error(
        "Paddle checkout URL missing — ensure the price is active in sandbox and API key matches the environment"
      );
    }

    return {
      id: transaction.id,
      url,
      customerId,
    };
  }

  async cancelSubscription(params: {
    userId: string;
  }): Promise<CancelSubscriptionResult> {
    const paddle = getPaddle();
    const sub = await getUserSubscriptionAdmin(params.userId);
    if (!sub || !hasMinTier(sub.tier, "plus") || !sub.paddleSubscriptionId) {
      throw new Error("No active paid subscription to cancel");
    }

    const updated = await paddle.subscriptions.cancel(sub.paddleSubscriptionId, {
      effectiveFrom: "next_billing_period",
    });

    const periodEnd = periodEndIso(
      updated.currentBillingPeriod?.endsAt,
      updated.nextBilledAt
    );
    const cancelAtPeriodEnd = cancelScheduled(updated) || true;

    await syncSubscriptionRow({
      userId: params.userId,
      customerId: updated.customerId,
      subscriptionId: updated.id,
      tier: tierFromSubscriptionLike({
        items: updated.items,
        customData: updated.customData as Record<string, unknown> | null,
      }),
      status: mapPaddleStatus(updated.status),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
    });

    return {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd,
      status: mapPaddleStatus(updated.status),
    };
  }

  async cancelSubscriptionImmediate(params: {
    userId: string;
  }): Promise<CancelSubscriptionResult> {
    const paddle = getPaddle();
    const sub = await getUserSubscriptionAdmin(params.userId);
    if (!sub?.paddleSubscriptionId) {
      throw new Error("No paid subscription to end");
    }

    const canceled = await paddle.subscriptions.cancel(sub.paddleSubscriptionId, {
      effectiveFrom: "immediately",
    });
    await finalizeDowngradeToFree(params.userId);

    return {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: periodEndIso(
        canceled.currentBillingPeriod?.endsAt,
        canceled.nextBilledAt
      ),
      status: "active",
    };
  }

  async handleWebhookEvent(event: BillingWebhookEvent): Promise<void> {
    const { userId } = event.data;
    if (!userId) return;

    const existing = await getUserSubscriptionAdmin(userId);

    switch (event.type) {
      case "checkout.session.completed": {
        const tier: SubscriptionTierId =
          event.data.tier === "pro" ? "pro" : "plus";
        await upsertUserSubscriptionAdmin({
          userId,
          tier,
          status: "active",
          paddleCustomerId:
            event.data.customerId ?? existing?.paddleCustomerId ?? null,
          paddleSubscriptionId:
            event.data.subscriptionId ?? existing?.paddleSubscriptionId ?? null,
          currentPeriodEnd:
            event.data.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: false,
          unlockedSceneKeys: [],
        });
        break;
      }
      case "customer.subscription.updated": {
        await upsertUserSubscriptionAdmin({
          userId,
          tier: event.data.tier ?? existing?.tier ?? "plus",
          status: event.data.status ?? existing?.status ?? "active",
          paddleCustomerId:
            event.data.customerId ?? existing?.paddleCustomerId ?? null,
          paddleSubscriptionId:
            event.data.subscriptionId ?? existing?.paddleSubscriptionId ?? null,
          currentPeriodEnd:
            event.data.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
          cancelAtPeriodEnd:
            event.data.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
        });
        break;
      }
      case "customer.subscription.deleted": {
        await finalizeDowngradeToFree(userId);
        break;
      }
      case "invoice.payment_failed": {
        await upsertUserSubscriptionAdmin({
          userId,
          tier: event.data.tier ?? existing?.tier ?? "plus",
          status: "past_due",
          paddleCustomerId:
            event.data.customerId ?? existing?.paddleCustomerId ?? null,
          paddleSubscriptionId:
            event.data.subscriptionId ?? existing?.paddleSubscriptionId ?? null,
          currentPeriodEnd:
            event.data.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
          cancelAtPeriodEnd:
            event.data.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
        });
        break;
      }
      default:
        break;
    }
  }

  async handlePaddleEvent(event: EventEntity): Promise<void> {
    switch (event.eventType) {
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionResumed: {
        const data = event.data;
        const userId =
          customDataString(
            data.customData as Record<string, unknown> | null,
            "userId"
          ) || null;
        if (!userId) {
          console.warn("paddle subscription event missing userId", data.id);
          return;
        }

        const cancelAtPeriodEnd = cancelScheduled(data);
        const status =
          event.eventType === EventName.SubscriptionPastDue
            ? "past_due"
            : mapPaddleStatus(data.status);

        await syncSubscriptionRow({
          userId,
          customerId: data.customerId,
          subscriptionId: data.id,
          tier: tierFromSubscriptionLike({
            items: data.items,
            customData: data.customData as Record<string, unknown> | null,
          }),
          status,
          currentPeriodEnd: periodEndIso(
            data.currentBillingPeriod?.endsAt,
            data.nextBilledAt
          ),
          cancelAtPeriodEnd,
          clearUnlockKeys:
            event.eventType === EventName.SubscriptionActivated ||
            event.eventType === EventName.SubscriptionCreated,
        });
        break;
      }

      case EventName.SubscriptionCanceled: {
        const data = event.data;
        const userId =
          customDataString(
            data.customData as Record<string, unknown> | null,
            "userId"
          ) || null;
        if (!userId) {
          console.warn("paddle subscription.canceled missing userId", data.id);
          return;
        }
        await finalizeDowngradeToFree(userId);
        break;
      }

      case EventName.TransactionPaymentFailed: {
        const data = event.data;
        const subscriptionId = data.subscriptionId;
        const userId =
          customDataString(
            data.customData as Record<string, unknown> | null,
            "userId"
          ) || null;
        if (!userId || !subscriptionId) return;

        const existing = await getUserSubscriptionAdmin(userId);
        await upsertUserSubscriptionAdmin({
          userId,
          tier: existing?.tier ?? "plus",
          status: "past_due",
          paddleCustomerId: data.customerId ?? existing?.paddleCustomerId ?? null,
          paddleSubscriptionId: subscriptionId,
          currentPeriodEnd: existing?.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: existing?.cancelAtPeriodEnd ?? false,
        });
        break;
      }

      default:
        break;
    }
  }

  async getCustomerPortalUrl(params: {
    userId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const paddle = getPaddle();
    const sub = await getUserSubscriptionAdmin(params.userId);
    if (!sub?.paddleCustomerId) {
      throw new Error("No Paddle customer on file — subscribe first");
    }

    const subscriptionIds = sub.paddleSubscriptionId
      ? [sub.paddleSubscriptionId]
      : [];
    const session = await paddle.customerPortalSessions.create(
      sub.paddleCustomerId,
      subscriptionIds
    );

    return { url: session.urls.general.overview };
  }
}
