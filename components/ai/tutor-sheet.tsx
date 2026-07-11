"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getContextLabel } from "@/lib/ai/context-builder";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { useApp } from "@/components/providers/app-provider";
import { TutorChat } from "./tutor-chat";

export function TutorSheet({
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
  const { dataset } = useApp();
  const contextLabel = getContextLabel(context, dataset);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[85dvh] flex-col gap-0 p-0 lg:hidden">
        <SheetHeader className="border-b border-border px-4 pb-3 pt-2">
          <SheetTitle>AI Tutor</SheetTitle>
          <Badge variant="secondary" className="w-fit">
            {contextLabel}
          </Badge>
        </SheetHeader>
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
      </SheetContent>
    </Sheet>
  );
}
