import { NextResponse } from "next/server";
import { unmarshalPaddleEvent } from "@/lib/services/billing/paddle-client";
import { paddleBillingProvider } from "@/lib/services/billing";
import { claimPaddleWebhookEvent } from "@/lib/services/billing/paddle-webhook-dedup";

/**
 * Signed Paddle Billing webhooks (Paddle-Signature + endpoint secret).
 * Dashboard: Developer tools → Notifications → URL destination
 *   https://www.matomari.com/api/webhooks/paddle
 */
export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing paddle-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    const payload = await request.text();
    event = await unmarshalPaddleEvent(payload, signature);
  } catch (err) {
    console.warn("paddle webhook signature verification failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    const shouldProcess = await claimPaddleWebhookEvent(event.eventId, event.eventType);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await paddleBillingProvider.handlePaddleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.warn("paddle webhook handler failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
