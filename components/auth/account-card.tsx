"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AccountCard() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return (
      <Card className="mb-6 p-4">
        <p className="text-sm text-muted">Loading account…</p>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Account</p>
            <p className="text-sm text-muted">
              Sign in with Google to sync your library across devices.
            </p>
          </div>
          <Button onClick={() => signIn("google")}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign in
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">Account</p>
          <p className="truncate text-sm text-muted">
            {session.user.email ?? session.user.name ?? "Signed in"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </Card>
  );
}
