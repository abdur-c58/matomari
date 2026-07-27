import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-staff";
import { getAdminActivityLog } from "@/lib/services/admin-service";
import type { AdminActionType } from "@/lib/supabase/admin-data";

const ACTION_TYPES: AdminActionType[] = [
  "role_change",
  "comp_access",
  "revoke_access",
  "refund_issued",
  "subscription_override",
];

export async function GET(request: Request) {
  const staff = await requireAdminSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { searchParams } = new URL(request.url);
  const actorUserId = searchParams.get("actor") ?? undefined;
  const actionParam = searchParams.get("action");
  const actionType =
    actionParam && ACTION_TYPES.includes(actionParam as AdminActionType)
      ? (actionParam as AdminActionType)
      : undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const logs = await getAdminActivityLog({
    actorUserId,
    actionType,
    from,
    to,
  });

  return NextResponse.json({ logs });
}
