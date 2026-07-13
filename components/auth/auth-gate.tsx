"use client";

import { useSession } from "next-auth/react";
import { signInWithGoogle } from "@/lib/auth/client-auth";
import { LogIn, WifiOff } from "lucide-react";
import { KotoshimaLogo } from "@/components/brand/kotoshima-logo";
import { LoadingState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/branding";
import { useOfflineLocalAccess } from "@/hooks/use-offline-local-access";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { allowed: offlineAllowed, checked: offlineChecked } = useOfflineLocalAccess();
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  if (status === "loading") {
    if (offline && offlineChecked && offlineAllowed) {
      return <>{children}</>;
    }

    if (offline && offlineChecked && !offlineAllowed) {
      return <OfflineUnavailableState />;
    }

    return <LoadingState />;
  }

  if (status !== "authenticated") {
    if (offline && offlineAllowed) {
      return <>{children}</>;
    }

    if (offline) {
      return <OfflineUnavailableState />;
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-sm text-center">
          <KotoshimaLogo size={120} className="mx-auto mb-6" />
          <h1 className="font-display text-2xl font-semibold text-foreground">{APP_NAME}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sign in to study, sync your islands, and track progress across devices.
          </p>
          <Button className="mt-8 w-full" size="lg" onClick={() => void signInWithGoogle()}>
            <LogIn className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function OfflineUnavailableState() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised">
          <WifiOff className="h-7 w-7 text-muted" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Connect to the internet once to sign in and download your islands for offline study.
        </p>
        <Button className="mt-8 w-full" size="lg" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
