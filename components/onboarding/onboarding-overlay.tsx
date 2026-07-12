"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button } from "@/components/ui/button";
import {
  onboardingSteps,
  onboardingStepCount,
} from "@/lib/content/onboarding-steps";
import {
  detectPwaInstallPlatform,
  getPwaInstallHint,
} from "@/lib/utils/pwa-install-hints";
import { fadeUp, smoothTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function OnboardingOverlay() {
  const {
    stepIndex,
    goNext,
    goBack,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  const step = onboardingSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === onboardingStepCount - 1;

  const [pwaHint, setPwaHint] = useState(() => getPwaInstallHint("desktop"));

  useEffect(() => {
    const platform = detectPwaInstallPlatform();
    setPwaHint(getPwaInstallHint(platform));
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const Icon = step.icon;

  const slideBullets = useMemo(() => {
    if (step.id === "install") {
      return pwaHint.steps;
    }
    return step.bullets ?? [];
  }, [pwaHint.steps, step.bullets, step.id]);

  const installTitle =
    step.id === "install" ? pwaHint.title : step.title;

  const handlePrimary = () => {
    if (isLast) {
      void completeOnboarding();
    } else {
      goNext();
    }
  };

  return (
    <div
      className="onboarding-overlay fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
    >
      <div className="onboarding-overlay-grain pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Step {stepIndex + 1} of {onboardingStepCount}
          </p>
          {!isLast && (
            <Button variant="ghost" size="sm" onClick={() => void skipOnboarding()}>
              Skip
            </Button>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center px-5 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={smoothTransition}
              className="mx-auto w-full max-w-lg"
            >
              <div className="relative mb-8 flex items-center gap-4">
                <span
                  className="onboarding-step-kanji font-brush pointer-events-none select-none"
                  aria-hidden="true"
                >
                  {step.kanji}
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-raised shadow-sm">
                  <Icon className="h-6 w-6 text-foreground" strokeWidth={1.75} />
                </span>
              </div>

              <h2
                id="onboarding-step-title"
                className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {installTitle}
              </h2>

              <div className="mt-4 space-y-3">
                {step.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>

              {slideBullets.length > 0 && (
                <ul className="mt-5 space-y-2.5 border-l-2 border-border pl-4">
                  {slideBullets.map((bullet) => (
                    <li key={bullet} className="text-sm leading-relaxed text-foreground/90">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="shrink-0 space-y-4 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-center gap-1.5">
            {onboardingSteps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === stepIndex
                    ? "w-6 bg-foreground"
                    : "w-1.5 bg-foreground/20"
                )}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              disabled={isFirst}
              onClick={goBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button className="flex-1 sm:min-w-[10rem]" onClick={handlePrimary}>
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
