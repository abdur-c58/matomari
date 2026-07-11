"use client";

import { useApp } from "@/components/providers/app-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Inbox, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  variant = "default",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "error";
}) {
  return (
    <Card
      variant="ghost"
      className={cn(
        "mx-auto mt-8 max-w-sm border-dashed border-border text-center",
        variant === "error" && "border-destructive/30"
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 py-10">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            variant === "error" ? "bg-destructive/10 text-destructive" : "bg-surface-raised text-foreground"
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-muted">{description}</p>
        {onAction && actionLabel && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
        {!onAction && actionHref && actionLabel && (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function LoadingState() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
    </div>
  );
}

export function AppGate({ children }: { children: React.ReactNode }) {
  const { loading, error, dataset, refresh } = useApp();

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <EmptyState
        title="Something went wrong"
        description={error}
        actionLabel="Retry"
        onAction={() => refresh()}
        icon={AlertCircle}
        variant="error"
      />
    );
  }

  if (!dataset) {
    return (
      <EmptyState
        title="No dataset yet"
        description="Import your Japanese sentence library to begin studying."
        actionHref="/import"
        actionLabel="Import JSON"
      />
    );
  }

  return <>{children}</>;
}
