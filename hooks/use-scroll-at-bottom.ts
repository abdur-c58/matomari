"use client";

import { useEffect, useRef, useState } from "react";

/** True when the sentinel element is visible in the viewport (user scrolled to the page bottom). */
export function useScrollAtBottom() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "0px 0px 80px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { isAtBottom, sentinelRef };
}
