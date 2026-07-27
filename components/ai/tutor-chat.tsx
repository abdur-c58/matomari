"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { getContextLabel } from "@/lib/ai/context-builder";
import type { ChatMessage, TutorContext } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { METHOD_NAME } from "@/lib/constants/branding";
import { fadeUp, smoothTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ChatMessageContent } from "@/components/ai/chat-message-content";
import { streamChat, AIClientError } from "@/lib/ai/ai-client";
import { useVisualViewportScroll } from "@/hooks/use-visual-viewport-scroll";

const MAX_INPUT_HEIGHT = 120;

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
  mobile?: boolean;
}

function adjustTextareaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
}

function ChatBubble({
  message,
  streaming,
  isLast,
}: {
  message: ChatMessage;
  streaming: boolean;
  isLast: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const isUser = message.role === "user";
  const showTyping =
    !isUser && isLast && streaming && !message.content.trim();

  return (
    <motion.div
      layout={!reduceMotion}
      variants={reduceMotion ? undefined : fadeUp}
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      transition={smoothTransition}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-md bg-cta text-cta-foreground"
            : "rounded-bl-md bg-surface-raised text-foreground"
        )}
      >
        {showTyping ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking…</span>
          </span>
        ) : (
          <ChatMessageContent
            content={message.content}
            variant={isUser ? "user" : "assistant"}
          />
        )}
      </div>
    </motion.div>
  );
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
  mobile = false,
}: TutorChatProps) {
  const { dataset } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextLabel = getContextLabel(context, dataset);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom(messages.length > 0 ? "smooth" : "auto");
    }
  }, [messages, streaming, open, scrollToBottom]);

  useVisualViewportScroll(scrollRef, open && mobile, [messages.length, streaming]);

  useEffect(() => {
    adjustTextareaHeight(inputRef.current);
  }, [input]);

  const handleInputChange = (value: string) => {
    onInputChange(value);
    requestAnimationFrame(() => adjustTextareaHeight(inputRef.current));
  };

  const handleSend = () => {
    if (!input.trim() || streaming || !dataset) return;
    onSend();
    requestAnimationFrame(() => adjustTextareaHeight(inputRef.current));
  };

  const contextHint =
    context.type === "sentence"
      ? "sentence"
      : context.type === "scene"
        ? "scene"
        : "topic";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {showHeader && (
        <div className="shrink-0 border-b border-border px-4 pb-3 pt-2">
          <p className="font-display text-lg font-semibold text-foreground">AI Tutor</p>
          <Badge variant="secondary" className="mt-1 w-fit">
            {contextLabel}
          </Badge>
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch px-4 py-4"
      >
        {messages.length === 0 && !error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothTransition}
            className="text-sm leading-relaxed text-muted"
          >
            Ask anything about Japanese, {METHOD_NAME.toLowerCase()}, or this {contextHint}.
          </motion.p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <ChatBubble
                key={`msg-${i}`}
                message={m}
                streaming={streaming}
                isLast={i === messages.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border bg-surface",
          mobile
            ? "px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            : "p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4",
          inputClassName
        )}
      >
        <div
          className={cn(
            "flex items-end gap-2",
            mobile && "rounded-2xl border border-border bg-surface-raised p-1.5 pl-3 shadow-sm"
          )}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question…"
            disabled={!dataset || streaming}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            spellCheck
            className={cn(
              "flex-1 resize-none bg-transparent text-base text-foreground placeholder:text-muted focus-visible:outline-none disabled:opacity-50",
              mobile
                ? "max-h-[120px] min-h-[2.75rem] py-2 leading-snug"
                : "min-h-[2.75rem] rounded-xl border border-border bg-surface px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-foreground/20"
            )}
          />
          <Button
            size="icon"
            className={cn("mb-0.5 shrink-0", mobile && "h-10 w-10 rounded-xl")}
            onClick={handleSend}
            disabled={!input.trim() || streaming || !dataset}
            aria-label="Send message"
          >
            {streaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {mobile && (
          <p className="mt-1.5 text-center text-[11px] text-muted">
            Enter to send · Shift+Enter for new line
          </p>
        )}
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
