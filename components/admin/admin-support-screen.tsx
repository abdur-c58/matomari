"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SupportMessageRow, SupportStatus } from "@/lib/services/support-service";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const CATEGORY_LABELS: Record<SupportMessageRow["category"], string> = {
  general: "General",
  billing: "Billing",
  bug: "Bug",
  account: "Account",
  other: "Other",
};

export function AdminSupportScreen() {
  const [status, setStatus] = useState<SupportStatus | "all">("open");
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load messages");
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(messageId: string, next: SupportStatus) {
    setUpdatingId(messageId);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Messages submitted from the public{" "}
        <Link href="/support" className="underline underline-offset-2">
          support page
        </Link>
        .
      </p>

      <div className="flex flex-wrap gap-2">
        {(["open", "resolved", "all"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "default" : "secondary"}
            onClick={() => setStatus(value)}
          >
            {value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted">No messages in this view.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const expanded = expandedId === message.id;
            return (
              <Card
                key={message.id}
                className={cn(
                  "p-4",
                  message.status === "open" && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-foreground">{message.subject}</h3>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[message.category]}
                      </Badge>
                      <Badge variant={message.status === "open" ? "warning" : "secondary"}>
                        {message.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {message.senderName ? `${message.senderName} · ` : ""}
                      <a
                        href={`mailto:${message.senderEmail}`}
                        className="text-foreground underline underline-offset-2"
                      >
                        {message.senderEmail}
                      </a>
                      {message.userId ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            href={`/admin/users/${message.userId}`}
                            className="text-foreground underline underline-offset-2"
                          >
                            View user
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(message.createdAt)}
                      {message.resolvedAt
                        ? ` · Resolved ${formatDate(message.resolvedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expanded ? null : message.id)}
                    >
                      {expanded ? "Hide" : "Read"}
                    </Button>
                    {message.status === "open" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === message.id}
                        onClick={() => void updateStatus(message.id, "resolved")}
                      >
                        Mark resolved
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === message.id}
                        onClick={() => void updateStatus(message.id, "open")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
                {expanded && (
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground">
                    {message.body}
                  </pre>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
