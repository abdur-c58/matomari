"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorContext } from "@/lib/ai/types";
import { useTutor } from "./tutor-provider";
import { cn } from "@/lib/utils";

export function AskButton({
  context,
  label = "Ask",
  variant = "ghost",
  size = "sm",
  className,
}: {
  context: TutorContext;
  label?: string;
  variant?: "ghost" | "secondary" | "outline";
  size?: "sm" | "default" | "icon";
  className?: string;
}) {
  const { openTutor } = useTutor();

  if (size === "icon") {
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn("shrink-0", className)}
        onClick={() => openTutor(context)}
        aria-label="Ask tutor"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => openTutor(context)}
    >
      <MessageCircle className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
