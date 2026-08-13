import { headers } from "next/headers";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthedUser =
  | { ok: true; userId: string; email?: string | null }
  | { ok: false; status: 401; error: string };

async function userFromBearer(): Promise<AuthedUser | null> {
  const authorization = (await headers()).get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)/i)?.[1];
  if (!token) return null;

  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, userId: data.user.id, email: data.user.email };
}

/** Require NextAuth session or a valid Supabase access token (iOS companion). */
export async function requireUserSession(): Promise<AuthedUser> {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (userId) {
    return {
      ok: true,
      userId,
      email: session.user?.email,
    };
  }

  const bearer = await userFromBearer();
  if (bearer) return bearer;

  return { ok: false, status: 401, error: "Unauthorized" };
}
