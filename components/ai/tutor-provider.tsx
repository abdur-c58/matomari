"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { TutorSheet } from "./tutor-sheet";
import { DesktopTutorPanel } from "./desktop-tutor-panel";
import { useTutorChatSend } from "./tutor-chat";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

interface TutorContextValue {
  openTutor: (context: TutorContext) => void;
  tutorOpen: boolean;
  closeTutor: () => void;
}

interface TutorChatState {
  open: boolean;
  setOpen: (open: boolean) => void;
  context: TutorContext;
  messages: ChatMessage[];
  input: string;
  streaming: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

const TutorCtx = createContext<TutorContextValue | null>(null);
const TutorChatCtx = createContext<TutorChatState | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<TutorContext>({ type: "general" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTutor = useCallback((ctx: TutorContext) => {
    setContext(ctx);
    setOpen(true);
  }, []);

  const closeTutor = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
      setError(null);
    }
  }, [open, context]);

  const send = useTutorChatSend(
    messages,
    setMessages,
    input,
    setInput,
    streaming,
    setStreaming,
    setError,
    context
  );

  const chatState: TutorChatState = {
    open,
    setOpen,
    context,
    messages,
    input,
    streaming,
    error,
    onInputChange: setInput,
    onSend: send,
  };

  const chatProps = {
    context,
    messages,
    input,
    streaming,
    error,
    onInputChange: setInput,
    onSend: send,
  };

  return (
    <TutorCtx.Provider value={{ openTutor, tutorOpen: open, closeTutor }}>
      <TutorChatCtx.Provider value={chatState}>
        {children}
        {isMobile && (
          <TutorSheet open={open} onOpenChange={setOpen} {...chatProps} />
        )}
      </TutorChatCtx.Provider>
    </TutorCtx.Provider>
  );
}

/** Renders inside DesktopShell for the right tutor column */
export function TutorPanelSlot() {
  const chat = useContext(TutorChatCtx);
  if (!chat) return null;

  return (
    <DesktopTutorPanel
      open={chat.open}
      onOpenChange={chat.setOpen}
      context={chat.context}
      messages={chat.messages}
      input={chat.input}
      streaming={chat.streaming}
      error={chat.error}
      onInputChange={chat.onInputChange}
      onSend={chat.onSend}
    />
  );
}

export function useTutor() {
  const ctx = useContext(TutorCtx);
  if (!ctx) throw new Error("useTutor must be used within TutorProvider");
  return ctx;
}
