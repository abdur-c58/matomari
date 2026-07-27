import type { Metadata } from "next";
import { SupportContactForm } from "@/components/support/support-contact-form";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { APP_NAME } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: `Support — ${APP_NAME}`,
  description: `Contact ${APP_NAME} support.`,
};

export default function SupportPage() {
  return (
    <div className="marketing-page relative min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-[calc(6rem+env(safe-area-inset-top,0px))] sm:px-8 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Support
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Questions about billing, your account, or how {APP_NAME} works? Send us a
          message and we&apos;ll reply by email.
        </p>
        <div className="mt-8">
          <SupportContactForm />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
