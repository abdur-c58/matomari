"use client";

import { RotateCcw } from "lucide-react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants/branding";

export function OnboardingReplaySection() {
  const { startOnboarding } = useOnboarding();

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-start gap-3">
        <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">App tour</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Replay the intro walkthrough to see what each part of {APP_NAME} does — from Today
            through study modes, settings, and adding the app to your home screen.
          </p>
        </div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={startOnboarding}>
        Replay onboarding
      </Button>
    </Card>
  );
}
