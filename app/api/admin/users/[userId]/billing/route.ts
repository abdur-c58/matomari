import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { applyAdminBillingAction } from "@/lib/services/admin-service";
import type { AdminActionType } from "@/lib/supabase/admin-data";

type RouteContext = { params: Promise<{ userId: string }> };

const ALLOWED: Record<
  string,
  Extract<
    AdminActionType,
    "comp_access" | "revoke_access" | "refund_issued" | "subscription_override"
  >
> = {
  comp: "comp_access",
  revoke: "revoke_access",
  refund: "refund_issued",
  override: "subscription_override",
};

export async function POST(request: Request, context: RouteContext) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { userId } = await context.params;
  let body: { action?: string; details?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actionType = body.action ? ALLOWED[body.action] : undefined;
  if (!actionType) {
    return NextResponse.json(
      { error: "action must be one of: comp, revoke, refund, override" },
      { status: 400 }
    );
  }

  const result = await applyAdminBillingAction({
    actorUserId: staff.userId,
    actionType,
    targetUserId: userId,
    details: body.details,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }

  return NextResponse.json(result);
}
