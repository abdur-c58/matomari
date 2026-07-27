import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/branding";

export const metadata = {
  title: `Welcome — ${APP_NAME}`,
  description: `Your ${APP_NAME} subscription is active.`,
};

export default function WelcomePage() {
  return (
    <div className="marketing-page relative min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 pb-24 pt-[calc(8rem+env(safe-area-inset-top,0px))] text-center sm:px-8 md:pt-40">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Subscription active
        </p>
        <h1 className="marketing-giant-type mt-6 text-[clamp(2.5rem,6vw,4rem)]">
          You&apos;re in.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Thanks for subscribing to {APP_NAME}. Your plan should appear in
          Settings within a few seconds while we confirm payment with Paddle.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/today">Start studying</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/settings">View subscription</Link>
          </Button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
