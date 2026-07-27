"use client";

import Link from "next/link";
import { Lock, Map } from "lucide-react";
import type { StudyUnitSummary } from "@/lib/services/study-unit-service";
import { DecoratedStudySurface } from "@/components/study/decorated-study-surface";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSceneAccess } from "@/hooks/use-scene-access";

export function StudyUnitCard({
  unit,
  href,
}: {
  unit: StudyUnitSummary;
  href: string;
}) {
  const { checkAccess, lockMessage } = useSceneAccess();
  const access =
    unit.ref.kind === "scene"
      ? checkAccess(unit.ref.key)
      : { accessible: true, reason: "ok" as const };
  const locked = !access.accessible;

  const pct =
    unit.sentenceCount > 0
      ? Math.round((unit.studiedCount / unit.sentenceCount) * 100)
      : 0;

  const featured = unit.isFeatured;
  const narration = unit.isNarration && !featured;

  const inner = (
      <DecoratedStudySurface
        kanji={unit.themeKanji}
        variant={featured ? "essentials" : narration ? "narration" : "scene"}
        className={cn(
          "rounded-xl border transition-all",
          locked && "opacity-70",
          featured
            ? "essentials-scene-card min-h-[10.5rem] border-red-700/70 p-5 sm:min-h-[12rem] sm:p-6"
            : cn(
                "desktop-hover-lift min-h-[4.5rem] p-3",
                narration
                  ? "narration-scene-card border-violet-300/70 hover:border-violet-400/80"
                  : "border-border/70 hover:border-foreground/30"
              )
        )}
      >
        <div className={cn("flex items-center", featured ? "gap-0" : "gap-3")}>
          {!featured && (
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground",
                locked
                  ? "bg-surface-raised text-muted"
                  : narration
                    ? "narration-scene-icon bg-[#9b87c7]/20 text-[#7a68ad]"
                    : "bg-surface-raised"
              )}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-semibold text-foreground",
                  featured
                    ? "font-display text-xl leading-snug sm:text-2xl"
                    : "truncate"
                )}
              >
                {unit.title}
              </p>
              {featured && (
                <Badge className="essentials-scene-badge border-transparent text-[11px]">
                  Essentials
                </Badge>
              )}
              {locked && (
                <Badge variant="secondary" className="text-[10px]">
                  Upgrade to access
                </Badge>
              )}
              {narration && !locked && (
                <Badge className="narration-scene-badge border-transparent text-[10px]">
                  Narration
                </Badge>
              )}
              {unit.isShared && (
                <Badge variant="secondary" className="text-[10px]">
                  Shared
                </Badge>
              )}
              {unit.complete && !locked && <Badge variant="success">Complete</Badge>}
              {unit.status === "in_progress" && !unit.complete && !locked && (
                <Badge variant="secondary">In progress</Badge>
              )}
            </div>
            <p
              className={cn(
                "text-muted",
                featured
                  ? "mt-1.5 text-sm leading-relaxed sm:line-clamp-3 sm:text-base"
                  : "truncate text-xs"
              )}
            >
              {locked ? lockMessage(access.reason) : unit.description}
            </p>
            {unit.createdByLabel && !locked && (
              <p className={cn("text-muted", featured ? "mt-1 text-xs" : "truncate text-[11px]")}>
                {unit.createdByLabel}
              </p>
            )}
            {!locked && (
              <div className={cn("flex items-center gap-2", featured ? "mt-4" : "mt-1.5")}>
                <div
                  className={cn(
                    "min-w-0 flex-1 overflow-hidden rounded-full bg-border",
                    featured ? "h-2" : "h-1"
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width]",
                      featured
                        ? "bg-red-800"
                        : narration
                          ? "bg-violet-500"
                          : "bg-foreground"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "shrink-0 tabular-nums text-muted",
                    featured ? "text-sm" : "text-[10px]"
                  )}
                >
                  {unit.studiedCount}/{unit.sentenceCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </DecoratedStudySurface>
  );

  if (locked) {
    return (
      <Link
        href="/billing/checkout"
        className={cn("group block rounded-xl", featured && "essentials-scene-glow")}
        title="Upgrade to access"
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl",
        featured && "essentials-scene-glow",
        narration && "narration-scene-glow"
      )}
    >
      {inner}
    </Link>
  );
}
