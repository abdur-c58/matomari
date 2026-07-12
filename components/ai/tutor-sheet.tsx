"use client";

import { X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContextLabel } from "@/lib/ai/context-builder";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { useApp } from "@/components/providers/app-provider";
import { TutorChat } from "./tutor-chat";
import { useIsMobileViewport, MOBILE_MEDIA_QUERY } from "@/hooks/use-is-mobile-viewport";

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
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  const contextLabel = getContextLabel(context, dataset);

  if (!isMobile) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs
      shouldScaleBackground={false}
      snapPoints={[0.94]}
      activeSnapPoint={0.94}
      setActiveSnapPoint={() => {}}
      fadeFromIndex={0}
    >
      <DrawerContent className="tutor-drawer mt-0 h-[94dvh] max-h-[94dvh] gap-0 overflow-hidden p-0 pb-0">
        <DrawerHeader className="shrink-0 border-b border-border px-4 pb-3 pt-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle>AI Tutor</DrawerTitle>
              <Badge variant="secondary" className="mt-1.5 w-fit max-w-full truncate">
                {contextLabel}
              </Badge>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Close tutor">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
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
          mobile
        />
      </DrawerContent>
    </Drawer>
  );
}
