import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrCreateSupabaseUser(params: {
  email: string;
  name?: string | null;
  googleSub: string;
}): Promise<string> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin is not configured (SUPABASE_SECRET_KEY)");
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: params.email,
    email_confirm: true,
    user_metadata: {
      name: params.name,
      google_sub: params.googleSub,
      provider: "google",
    },
  });

  if (!createError && created.user) {
    return created.user.id;
  }

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(listError.message);
  }

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === params.email.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }

  throw new Error(createError?.message ?? "Failed to provision Supabase user");
}
