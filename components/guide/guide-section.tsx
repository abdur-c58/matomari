import { cn } from "@/lib/utils";
import type { GuideAccent } from "@/lib/content/method-guide";

const accentStripe: Record<GuideAccent, string> = {
  neutral: "bg-foreground",
  meaning_check: "bg-mode-meaning",
  listen_shadow: "bg-mode-listen",
  active_recall: "bg-mode-recall",
  review: "bg-mode-review",
};

export function GuideSection({
  title,
  description,
  accent = "neutral",
  children,
  className,
}: {
  title: string;
  description?: string;
  accent?: GuideAccent;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", accentStripe[accent])}
          aria-hidden
        />
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
