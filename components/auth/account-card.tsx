"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDisplayName } from "@/lib/utils/greeting";

export function AccountCard() {
  const { data: session, status } = useSession();
  const { progress, setProgress } = useApp();
  const loading = status === "loading";
  const sessionName =
    session?.user && getDisplayName(session.user) !== "there"
      ? getDisplayName(session.user)
      : "";
  const [displayName, setDisplayName] = useState(
    progress.settings.displayName ?? sessionName
  );

  useEffect(() => {
    setDisplayName(progress.settings.displayName ?? sessionName);
  }, [progress.settings.displayName, sessionName]);

  const saveDisplayName = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      const next = trimmed || undefined;
      if (next === progress.settings.displayName) return;
      await setProgress({
        ...progress,
        settings: { ...progress.settings, displayName: next },
      });
    },
    [progress, setProgress]
  );

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

      <div className="mt-4 border-t border-border-subtle pt-4">
        <Label htmlFor="display-name" className="text-sm font-medium">
          Display name
        </Label>
        <p className="mb-2 text-xs text-muted">
          Used in template sentences like &ldquo;I&apos;m [name].&rdquo; Defaults to your Google first
          name.
        </p>
        <Input
          id="display-name"
          value={displayName}
          placeholder={sessionName || "Your name"}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => void saveDisplayName(displayName)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </Card>
  );
}
