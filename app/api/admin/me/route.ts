import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import {
  canGrantSubscriptions,
  isSubscriptionGrantOwner,
} from "@/lib/auth/subscription-grant-permissions";

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
    canGrantSubscriptions: canGrantSubscriptions({
      userId: staff.userId,
      email: staff.email ?? null,
      profile: staff.profile,
    }),
    isSubscriptionGrantOwner: isSubscriptionGrantOwner({
      userId: staff.userId,
      email: staff.email ?? null,
    }),
  });
}
