"use client";

import { useEffect, useState } from "react";

export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

export function useIsMobileViewport(query = MOBILE_MEDIA_QUERY) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
