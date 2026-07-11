"use client";

import { signIn, useSession } from "next-auth/react";
import { LogIn } from "lucide-react";
import { LoadingState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/branding";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-sm text-center">
          <img
            src="/readmeimage.png"
            alt={APP_NAME}
            width={120}
            height={120}
            className="mx-auto mb-6 rounded-2xl"
          />
          <h1 className="font-display text-2xl font-semibold text-foreground">{APP_NAME}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sign in to study, sync your islands, and track progress across devices.
          </p>
          <Button className="mt-8 w-full" size="lg" onClick={() => signIn("google")}>
            <LogIn className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
