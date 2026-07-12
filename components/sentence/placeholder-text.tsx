"use client";

import type { Sentence } from "@/types/sentence";
import {
  getPlaceholderSpec,
  parsePlaceholderTags,
  resolvePlaceholderDisplayValue,
} from "@/lib/sentence/placeholders";
import { useLearnerName } from "@/hooks/use-learner-name";
import { cn } from "@/lib/utils";

type PlaceholderTextProps = {
  text: string;
  sentence?: Pick<Sentence, "placeholders">;
  className?: string;
  as?: "span" | "p";
};

function PlaceholderChip({
  children,
  resolved,
}: {
  children: React.ReactNode;
  resolved: boolean;
}) {
  return (
    <span
      className={cn(
        "mx-0.5 inline rounded-md px-1.5 py-0.5 font-medium ring-1",
        resolved
          ? "bg-mode-meaning/15 text-mode-meaning ring-mode-meaning/25"
          : "bg-surface-raised text-muted ring-border"
      )}
    >
      {children}
    </span>
  );
}

export function PlaceholderText({
  text,
  sentence,
  className,
  as: Component = "span",
}: PlaceholderTextProps) {
  const learnerName = useLearnerName();
  const segments = parsePlaceholderTags(text);

  if (segments.length === 1 && segments[0].type === "text") {
    return <Component className={className}>{text}</Component>;
  }

  return (
    <Component className={className}>
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
        }

        const spec = sentence ? getPlaceholderSpec(sentence, segment.tag) : undefined;
        const resolved = spec?.resolveAs === "learner" && Boolean(learnerName);
        const display = resolvePlaceholderDisplayValue(segment.tag, spec, learnerName);

        return (
          <PlaceholderChip key={i} resolved={resolved}>
            {display}
          </PlaceholderChip>
        );
      })}
    </Component>
  );
}
