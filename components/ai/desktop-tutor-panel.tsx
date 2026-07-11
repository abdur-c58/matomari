"use client";

import { X } from "lucide-react";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { TutorChat } from "./tutor-chat";

export function DesktopTutorPanel({
  open,
  onOpenChange,
  context,
  messages,
  input,
  streaming,
  error,
  onInputChange,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: TutorContext;
  messages: ChatMessage[];
  input: string;
  streaming: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
}) {
  if (!open) return null;

  return (
    <aside
      className="hidden lg:flex lg:h-dvh lg:w-96 lg:shrink-0 lg:flex-col lg:border-l lg:border-border lg:bg-surface"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-semibold text-foreground">AI Tutor</p>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close tutor">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <TutorChat
        context={context}
        open={open}
        messages={messages}
        input={input}
        streaming={streaming}
        error={error}
        onInputChange={onInputChange}
        onSend={onSend}
        showHeader={false}
      />
    </aside>
  );
}
