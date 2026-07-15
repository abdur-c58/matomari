"use client";

import { formatCreatedBy } from "@/lib/services/island-identity-service";
import type { IslandCreatedBy } from "@/types/sentence";

export function CreatedByLabel({
  createdBy,
  className,
}: {
  createdBy?: IslandCreatedBy | null;
  className?: string;
}) {
  const label = formatCreatedBy(createdBy);
  if (!label) return null;
  return <p className={className ?? "text-xs text-muted"}>{label}</p>;
}
