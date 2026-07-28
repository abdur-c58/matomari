import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { setUserSubscriptionGrantCapability } from "@/lib/services/admin-service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { userId } = await context.params;
  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be boolean" },
      { status: 400 }
    );
  }

  const result = await setUserSubscriptionGrantCapability({
    actorUserId: staff.userId,
    actorEmail: staff.email ?? null,
    targetUserId: userId,
    enabled: body.enabled,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    profile: result.profile,
    audit: result.audit,
  });
}
