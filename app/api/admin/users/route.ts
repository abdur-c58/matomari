import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { listAdminUsers } from "@/lib/services/admin-service";
import type { AppRole } from "@/lib/supabase/profiles-data";

export async function GET(request: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const roleParam = searchParams.get("role");
  const role =
    roleParam === "user" || roleParam === "admin" || roleParam === "support"
      ? (roleParam as AppRole)
      : undefined;

  const users = await listAdminUsers({ search, role });
  return NextResponse.json({ users });
}
