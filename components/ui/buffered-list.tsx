"use client";

import type { ReactNode, RefObject } from "react";

/** Sentinel placed after a buffered slice — keep in the DOM while hasMore. */
export function BufferedListSentinel({
  hasMore,
  sentinelRef,
  remaining,
}: {
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  remaining?: number;
}) {
  if (!hasMore) return null;

  return (
    <div
      ref={sentinelRef}
      className="flex h-10 items-center justify-center"
      aria-hidden
    >
      {typeof remaining === "number" && remaining > 0 ? (
        <span className="text-[10px] tabular-nums text-muted/70">
          {remaining} more
        </span>
      ) : null}
    </div>
  );
}

export function sliceBuffered<T>(items: T[], visibleCount: number): T[] {
  if (visibleCount >= items.length) return items;
  return items.slice(0, visibleCount);
}

export function mapBuffered<T>(
  items: T[],
  visibleCount: number,
  render: (item: T, index: number) => ReactNode
): ReactNode[] {
  const slice = sliceBuffered(items, visibleCount);
  return slice.map((item, index) => render(item, index));
}
