"use client";

import { useState } from "react";
import type { PlacementLevel } from "@/types/progress";
import {
  PLACEMENT_FLUENCY_OPTIONS,
  PLACEMENT_JLPT_OPTIONS,
} from "@/lib/constants/pathway-placement";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function PlacementSelfAssess({
  onContinue,
}: {
  onContinue: (level: PlacementLevel, levelMode: "fluency" | "jlpt") => void;
}) {
  const [levelMode, setLevelMode] = useState<"fluency" | "jlpt">("fluency");
  const [selected, setSelected] = useState<PlacementLevel | null>(null);

  const options =
    levelMode === "fluency" ? PLACEMENT_FLUENCY_OPTIONS : PLACEMENT_JLPT_OPTIONS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          How much Japanese do you know?
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          We&apos;ll use this to find the right place in the main pathway — so you
          don&apos;t repeat what you already know.
        </p>
      </div>

      <Tabs
        value={levelMode}
        onValueChange={(v) => {
          setLevelMode(v as "fluency" | "jlpt");
          setSelected(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fluency">By experience</TabsTrigger>
          <TabsTrigger value="jlpt">JLPT level</TabsTrigger>
        </TabsList>

        <TabsContent value={levelMode} className="mt-4 space-y-2">
          {options.map((opt) => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className="w-full text-left"
              >
                <Card
                  className={cn(
                    "p-4 transition-all",
                    active
                      ? "border-foreground bg-foreground/5 shadow-sm"
                      : "hover:border-foreground/30"
                  )}
                >
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="mt-1 text-sm text-muted">{opt.description}</p>
                </Card>
              </button>
            );
          })}
        </TabsContent>
      </Tabs>

      <Button
        className="w-full"
        size="lg"
        disabled={!selected}
        onClick={() => selected && onContinue(selected, levelMode)}
      >
        Continue
      </Button>
    </div>
  );
}
