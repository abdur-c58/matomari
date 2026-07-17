"use client";

import { signIn, signOut } from "next-auth/react";

/** Always show Google's account picker so re-login is an explicit OAuth step. */
const GOOGLE_AUTH_PARAMS = { prompt: "select_account" };

export function signInWithGoogle() {
  return signIn("google", { redirectTo: "/today" }, GOOGLE_AUTH_PARAMS);
}

export function signOutCompletely() {
  return signOut({ redirectTo: "/" });
}
