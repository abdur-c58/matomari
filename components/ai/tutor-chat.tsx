"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { getContextLabel } from "@/lib/ai/context-builder";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { METHOD_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";
import { streamChat, AIClientError } from "@/lib/ai/ai-client";

export interface TutorChatProps {
  context: TutorContext;
  open: boolean;
  messages: ChatMessage[];
  input: string;
  streaming: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  className?: string;
  inputClassName?: string;
  showHeader?: boolean;
}

export function TutorChat({
  context,
  open,
  messages,
  input,
  streaming,
  error,
  onInputChange,
  onSend,
  className,
  inputClassName,
  showHeader = true,
}: TutorChatProps) {
  const { dataset } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextLabel = getContextLabel(context, dataset);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, streaming, open]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {showHeader && (
        <div className="border-b border-border px-4 pb-3 pt-2">
          <p className="font-display text-lg font-semibold text-foreground">AI Tutor</p>
          <Badge variant="secondary" className="mt-1 w-fit">
            {contextLabel}
          </Badge>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-touch px-4 py-4">
        {messages.length === 0 && !error && (
          <p className="text-sm text-muted">
            Ask anything about Japanese, {METHOD_NAME.toLowerCase()}, or this{" "}
            {context.type === "sentence"
              ? "sentence"
              : context.type === "island"
                ? "island"
                : "topic"}
            .
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-cta text-cta-foreground"
                  : "bg-surface-raised text-foreground"
              )}
            >
              {m.content ||
                (streaming && i === messages.length - 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null)}
            </div>
          ))}
        </div>
      </div>

      <div className={cn("border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4", inputClassName)}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Ask a question…"
            disabled={!dataset || streaming}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={onSend}
            disabled={!input.trim() || streaming || !dataset}
            aria-label="Send"
          >
            {streaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useTutorChatSend(
  messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  input: string,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  streaming: boolean,
  setStreaming: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  context: TutorContext
) {
  const { dataset, progress } = useApp();

  return useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !dataset) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    setError(null);

    let assistantText = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      for await (const chunk of streamChat(nextMessages, context, dataset, progress)) {
        assistantText += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      }
    } catch (e) {
      if (e instanceof AIClientError && e.code === "NOT_CONFIGURED") {
        setError("AI is not configured. Add OPENAI_API_KEY to your environment.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
      setMessages(messages);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, dataset, messages, context, progress, setMessages, setInput, setStreaming, setError]);
}
