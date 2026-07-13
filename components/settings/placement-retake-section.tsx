"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PlacementRetakeSection() {
  return (
    <Card className="mb-6 p-4">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Pathway placement</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Retake the level check to adjust where you start on the main pathway.
            This only skips batches you haven&apos;t studied yet — it won&apos;t reset
            sentences you&apos;ve already worked on.
          </p>
        </div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" asChild>
        <Link href="/placement?retake=1">Retake placement</Link>
      </Button>
    </Card>
  );
}
