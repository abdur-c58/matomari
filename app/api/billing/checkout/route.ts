import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { billingProvider } from "@/lib/services/billing";

export async function POST(request: Request) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: {
    successUrl?: string;
    cancelUrl?: string;
    plan?: "plus" | "pro";
    interval?: "monthly" | "annual";
  } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const plan = body.plan === "pro" ? "pro" : "plus";
  const interval = body.interval === "annual" ? "annual" : "monthly";
  const origin = new URL(request.url).origin;

  try {
    const session = await billingProvider.createCheckoutSession({
      userId: user.userId,
      email: user.email,
      successUrl: body.successUrl ?? `${origin}/settings?upgraded=1`,
      cancelUrl: body.cancelUrl ?? `${origin}/billing/checkout?plan=${plan}&interval=${interval}`,
      plan,
      interval,
    });
    return NextResponse.json({ session });
  } catch (err) {
    console.warn("checkout session failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not start checkout",
      },
      { status: 400 }
    );
  }
}
