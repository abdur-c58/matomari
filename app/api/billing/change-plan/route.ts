import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserSession } from "@/lib/auth/require-user";
import { billingProvider } from "@/lib/services/billing";

const bodySchema = z.object({
  plan: z.enum(["plus", "pro"]),
});

export async function POST(request: Request) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "plan must be plus or pro" },
      { status: 400 }
    );
  }

  try {
    const result = await billingProvider.changeSubscriptionPlan({
      userId: user.userId,
      plan: parsed.data.plan,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.warn("change-plan failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not change plan",
      },
      { status: 400 }
    );
  }
}
