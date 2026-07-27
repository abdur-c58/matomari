import { auth } from "@/auth";
import { fetchProfileAdmin, type AppRole, type ProfileRow } from "@/lib/supabase/profiles-data";

export type StaffRole = Extract<AppRole, "admin" | "support">;

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "support";
}

export function isAdminRole(role: string | null | undefined): role is "admin" {
  return role === "admin";
}

export type StaffSession =
  | {
      ok: true;
      userId: string;
      email: string | null | undefined;
      role: StaffRole;
      profile: ProfileRow;
    }
  | { ok: false; status: 401 | 403; error: string };

/** Server-side staff gate for admin API routes and layouts. */
export async function requireStaffSession(): Promise<StaffSession> {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const profile = await fetchProfileAdmin(userId);
  if (!profile || !isStaffRole(profile.role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    userId,
    email: session.user?.email,
    role: profile.role,
    profile,
  };
}

export async function requireAdminSession(): Promise<StaffSession> {
  const staff = await requireStaffSession();
  if (!staff.ok) return staff;
  if (!isAdminRole(staff.role)) {
    return { ok: false, status: 403, error: "Admin role required" };
  }
  return staff;
}
