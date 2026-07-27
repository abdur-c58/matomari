import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-staff";
import { changeUserRole } from "@/lib/services/admin-service";
import type { AppRole } from "@/lib/supabase/profiles-data";

type RouteContext = { params: Promise<{ userId: string }> };

const ROLES: AppRole[] = ["user", "admin", "support"];

export async function POST(request: Request, context: RouteContext) {
  const staff = await requireAdminSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { userId } = await context.params;
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextRole = body.role;
  if (!nextRole || !ROLES.includes(nextRole as AppRole)) {
    return NextResponse.json(
      { error: "role must be one of: user, admin, support" },
      { status: 400 }
    );
  }

  const result = await changeUserRole({
    actorUserId: staff.userId,
    actorRole: staff.role,
    targetUserId: userId,
    nextRole: nextRole as AppRole,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    profile: result.profile,
    audit: result.audit,
  });
}
