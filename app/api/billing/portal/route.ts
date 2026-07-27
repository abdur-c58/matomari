import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { billingProvider } from "@/lib/services/billing";

export async function POST(request: Request) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: { returnUrl?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const origin = new URL(request.url).origin;
  try {
    const portal = await billingProvider.getCustomerPortalUrl({
      userId: user.userId,
      returnUrl: body.returnUrl ?? `${origin}/settings`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Portal unavailable" },
      { status: 400 }
    );
  }
}
