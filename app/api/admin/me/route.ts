import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";

/** Current staff session role for client UI gating. */
export async function GET() {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  return NextResponse.json({
    userId: staff.userId,
    email: staff.email ?? null,
    role: staff.role,
    displayName: staff.profile.displayName,
  });
}
