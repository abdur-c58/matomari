import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-page relative min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-[calc(6rem+env(safe-area-inset-top,0px))] sm:px-8 md:pt-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Legal
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">Effective {effectiveDate}</p>
        <article className="legal-prose mt-10 space-y-8 text-base leading-relaxed text-foreground/90">
          {children}
        </article>
        <Link
          href="/"
          className="mt-12 inline-block text-sm text-muted underline underline-offset-2 hover:text-foreground"
        >
          Back to home
        </Link>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
