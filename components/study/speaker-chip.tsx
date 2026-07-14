import type { NarrationSpeaker } from "@/types/sentence";
import { cn } from "@/lib/utils";

export function SpeakerChip({
  speaker,
  className,
}: {
  speaker: NarrationSpeaker;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border px-1.5 text-[10px] font-semibold tracking-wide",
        speaker === "A"
          ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
          : "border-border/70 bg-muted/25 text-muted",
        className
      )}
      aria-label={`Speaker ${speaker}`}
    >
      {speaker}
    </span>
  );
}
