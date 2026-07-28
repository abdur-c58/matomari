import type { ProfileRow } from "@/lib/supabase/profiles-data";

export const SUBSCRIPTION_GRANT_OWNER_USER_ID =
  "9446ec2d-d0e0-4359-95c2-727206ce88b4";
export const SUBSCRIPTION_GRANT_OWNER_EMAIL = "bagu.2k5.58@gmail.com";

export function isSubscriptionGrantOwner(params: {
  userId?: string | null;
  email?: string | null;
}): boolean {
  return (
    params.userId === SUBSCRIPTION_GRANT_OWNER_USER_ID ||
    params.email?.trim().toLowerCase() === SUBSCRIPTION_GRANT_OWNER_EMAIL
  );
}

export function canGrantSubscriptions(params: {
  userId?: string | null;
  email?: string | null;
  profile?: Pick<ProfileRow, "role" | "canGrantSubscriptions"> | null;
}): boolean {
  if (isSubscriptionGrantOwner(params)) return true;
  return (
    params.profile?.role === "admin" &&
    Boolean(params.profile.canGrantSubscriptions)
  );
}
