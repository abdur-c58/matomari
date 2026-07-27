import { auth } from "@/auth";

export type AuthedUser =
  | { ok: true; userId: string; email?: string | null }
  | { ok: false; status: 401; error: string };

/** Require a signed-in session with a provisioned Supabase user id. */
export async function requireUserSession(): Promise<AuthedUser> {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return {
    ok: true,
    userId,
    email: session.user?.email,
  };
}
