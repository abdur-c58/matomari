import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-staff";
import { getAdminSystemHealth } from "@/lib/services/admin-service";

export async function GET() {
  const staff = await requireAdminSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const health = await getAdminSystemHealth();
  return NextResponse.json({ health });
}
