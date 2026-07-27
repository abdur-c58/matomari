"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { onboardingSteps } from "@/lib/content/onboarding-steps";

/**
 * localStorage key used as a fast, synchronous guard.
 * Written when the user completes or skips onboarding on *any* device, and
 * also kept in sync with the Supabase-backed progress field so cross-device
 * sign-ins are covered once the remote pull arrives.
 */
const LS_DONE_KEY = "matomari-onboarding-done";

function lsGetDone(): boolean {
  try {
    return localStorage.getItem(LS_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function lsSetDone() {
  try {
    localStorage.setItem(LS_DONE_KEY, "1");
  } catch {
    // private-browsing / SSR — safe to ignore
  }
}

type OnboardingContextValue = {
  isOpen: boolean;
  stepIndex: number;
  startOnboarding: () => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  goNext: () => void;
  goBack: () => void;
  goToStep: (index: number) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { progress, loading, setProgress } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const manualReplayRef = useRef(false);
  const autoTriggeredRef = useRef(false);

  const persistCompletion = useCallback(async () => {
    await setProgress({
      ...progress,
      settings: {
        ...progress.settings,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      },
    });
  }, [progress, setProgress]);

  const completeOnboarding = useCallback(async () => {
    manualReplayRef.current = false;
    // Write localStorage immediately — before the async Supabase save — so the
    // overlay can never re-appear even if the user navigates away and back
    // before the sync cycle has flushed the completion to the cloud.
    lsSetDone();
    setIsOpen(false);
    setStepIndex(0);
    if (!progress.settings.onboardingCompleted) {
      await persistCompletion();
    }
  }, [persistCompletion, progress.settings.onboardingCompleted]);

  const skipOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const startOnboarding = useCallback(() => {
    manualReplayRef.current = true;
    autoTriggeredRef.current = true;
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(onboardingSteps.length - 1, i + 1));
  }, []);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
  }, []);

  // Keep the localStorage flag in sync with Supabase progress so that
  // cross-device sign-ins are covered once the remote pull arrives.
  useEffect(() => {
    if (progress.settings.onboardingCompleted === true) {
      lsSetDone();
    }
  }, [progress.settings.onboardingCompleted]);

  useEffect(() => {
    if (loading) return;
    if (autoTriggeredRef.current) return;
    if (manualReplayRef.current) return;
    if (pathname.startsWith("/settings/preferences")) return;
    if (progress.settings.onboardingCompleted !== false) return;

    // Fast synchronous guard: localStorage says the user has completed
    // onboarding on this device.  Skip the overlay even if the Supabase pull
    // hasn't updated progress yet — the merge-remote-progress fix will correct
    // the value on the next cycle and this effect won't re-fire.
    if (lsGetDone()) {
      autoTriggeredRef.current = true;
      return;
    }

    autoTriggeredRef.current = true;
    setStepIndex(0);
    setIsOpen(true);
  }, [
    loading,
    pathname,
    progress.settings.onboardingCompleted,
  ]);

  const value = useMemo(
    () => ({
      isOpen,
      stepIndex,
      startOnboarding,
      completeOnboarding,
      skipOnboarding,
      goNext,
      goBack,
      goToStep,
    }),
    [
      isOpen,
      stepIndex,
      startOnboarding,
      completeOnboarding,
      skipOnboarding,
      goNext,
      goBack,
      goToStep,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {isOpen && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  );
}
