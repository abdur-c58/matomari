"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function isSamePageHref(href: string): boolean {
  if (!href || href.startsWith("#")) return true;
  try {
    const target = new URL(href, window.location.origin);
    return (
      target.origin === window.location.origin &&
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    );
  } catch {
    return false;
  }
}

function isInternalAppHref(href: string): boolean {
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    return new URL(href, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function useUnsavedPreferencesGuard({
  enabled,
  leaveHref,
}: {
  enabled: boolean;
  /** Default destination when the user uses browser back with unsaved changes. */
  leaveHref: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const leavingRef = useRef(false);

  const requestLeave = useCallback(
    (href: string) => {
      if (leavingRef.current || isSamePageHref(href)) return;
      if (!enabled) {
        router.push(href);
        return;
      }
      setPendingHref(href);
      setDialogOpen(true);
    },
    [enabled, router]
  );

  const completeLeave = useCallback(
    (href: string) => {
      leavingRef.current = true;
      setDialogOpen(false);
      setPendingHref(null);
      router.push(href);
    },
    [router]
  );

  const dismissDialog = useCallback(() => {
    setDialogOpen(false);
    setPendingHref(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalAppHref(href) || isSamePageHref(href)) return;

      event.preventDefault();
      event.stopPropagation();
      requestLeave(href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, requestLeave]);

  useEffect(() => {
    if (!enabled) return;

    const currentUrl = window.location.href;
    window.history.pushState({ preferencesUnsavedGuard: true }, "", currentUrl);

    const onPopState = () => {
      window.history.pushState({ preferencesUnsavedGuard: true }, "", currentUrl);
      requestLeave(leaveHref);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, leaveHref, requestLeave]);

  return {
    dialogOpen,
    pendingHref,
    requestLeave,
    completeLeave,
    dismissDialog,
    setDialogOpen,
  };
}
