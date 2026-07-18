"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { KotoshimaLogo } from "@/components/brand/kotoshima-logo";
import {
  isMarketingSectionId,
  rememberMarketingSection,
  scrollToMarketingSection,
} from "@/components/marketing/motion/scroll-to-section";
import { useSmoothScroll } from "@/components/marketing/motion/smooth-scroll-provider";
import { APP_NAME } from "@/lib/constants/branding";
import { marketingFooter } from "@/lib/constants/marketing";

export function MarketingFooter() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { lenis } = useSmoothScroll();
  const signedIn = status === "authenticated";
  const onHome = pathname === "/";

  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <KotoshimaLogo size={40} />
            <span className="font-display text-lg font-semibold">{APP_NAME}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {marketingFooter.tagline}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
          {marketingFooter.links.map((link) => {
            const isAuthLink = link.href === "/today";
            const label =
              isAuthLink && signedIn ? "Dashboard" : isAuthLink ? "Sign in" : link.label;
            const section =
              "section" in link && typeof link.section === "string"
                ? link.section
                : null;

            if (section && isMarketingSectionId(section)) {
              return (
                <li key={`${link.label}-${section}`}>
                  <button
                    type="button"
                    className="transition-opacity hover:text-foreground hover:opacity-90"
                    onClick={() => {
                      if (onHome) {
                        scrollToMarketingSection(section, lenis);
                        return;
                      }
                      rememberMarketingSection(section);
                      router.push("/");
                    }}
                  >
                    {label}
                  </button>
                </li>
              );
            }

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-opacity hover:text-foreground hover:opacity-90"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-border/70 py-4 text-center text-xs text-muted">
        <p className="m-0">
          © {new Date().getFullYear()} {APP_NAME}
          <span className="mx-2 text-border" aria-hidden>
            ·
          </span>
          Made by pank&ren
        </p>
      </div>
    </footer>
  );
}
