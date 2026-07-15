import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateSupabaseUser } from "@/lib/auth/provision-supabase-user";
import { upsertProfileAdmin } from "@/lib/supabase/profiles-data";

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.CLIENT_SECRET;
const authSecret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  providers:
    googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const supabaseUserId = await getOrCreateSupabaseUser({
          email: profile.email,
          name: typeof profile.name === "string" ? profile.name : null,
          googleSub: account.providerAccountId,
        });
        token.supabaseUserId = supabaseUserId;

        const displayName =
          (typeof profile.name === "string" && profile.name.trim()) ||
          profile.email.split("@")[0] ||
          "Learner";
        const avatarUrl =
          typeof profile.picture === "string" ? profile.picture : null;
        void upsertProfileAdmin({
          userId: supabaseUserId,
          displayName,
          avatarUrl,
        }).catch((err) => {
          console.warn("Profile sync failed:", err);
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.supabaseUserId =
          typeof token.supabaseUserId === "string" ? token.supabaseUserId : undefined;
      }
      return session;
    },
  },
});
