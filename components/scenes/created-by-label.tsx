"use client";

import { formatCreatedBy } from "@/lib/services/scene-identity-service";
import type { SceneCreatedBy } from "@/types/sentence";

export function CreatedByLabel({
  createdBy,
  className,
}: {
  createdBy?: SceneCreatedBy | null;
  className?: string;
}) {
  const label = formatCreatedBy(createdBy);
  if (!label) return null;
  return <p className={className ?? "text-xs text-muted"}>{label}</p>;
}
