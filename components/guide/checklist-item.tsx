import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ModeIcon } from "@/components/ui/mode-icon";
import { Card } from "@/components/ui/card";
import { modeAccentBorder, modeBadgeStyles } from "@/components/ui/mode-icon";
import type { GuideChecklistItem } from "@/lib/content/method-guide";
import { cn } from "@/lib/utils";

export function ChecklistItem({ item }: { item: GuideChecklistItem }) {
  return (
    <Link href={item.href}>
      <Card
        variant="interactive"
        className={cn("border-l-4 p-4", modeAccentBorder[item.type])}
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <ModeIcon type={item.type} />
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                modeBadgeStyles[item.type]
              )}
            >
              {item.step}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted leading-snug">{item.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </div>
      </Card>
    </Link>
  );
}
