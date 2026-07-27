import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { billingProvider } from "@/lib/services/billing";

export async function POST() {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  try {
    const result = await billingProvider.cancelSubscription({
      userId: user.userId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cancel failed" },
      { status: 400 }
    );
  }
}
