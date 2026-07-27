import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { getAdminUserDetail } from "@/lib/services/admin-service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await getAdminUserDetail(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
