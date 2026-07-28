"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

/** Installed PWA launches should stay inside the authenticated app shell. */
export function StandaloneAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isStandalonePwa()) return;
    if (pathname === "/today") return;
    router.replace("/today");
  }, [pathname, router]);

  return null;
}
