import Link from "next/link";
import { Compass, Home, Sparkles } from "lucide-react";
import { NotFoundAudioButton } from "@/components/errors/not-found-audio-button";
import { MarketingCustomCursor } from "@/components/marketing/custom-cursor";
import { APP_NAME } from "@/lib/constants/branding";

export default function NotFound() {
  return (
    <main className="marketing-page relative min-h-dvh overflow-hidden bg-background text-foreground">
      <MarketingCustomCursor />
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--mode-review) 18%, transparent), transparent 30%), radial-gradient(circle at 80% 15%, color-mix(in srgb, var(--mode-listen) 18%, transparent), transparent 32%), radial-gradient(circle at 50% 80%, color-mix(in srgb, var(--mode-meaning) 14%, transparent), transparent 34%)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-6 top-24 hidden rounded-[2rem] border border-border/60 bg-surface/60 px-5 py-4 shadow-sm backdrop-blur-xl md:block"
        style={{ transform: "rotate(-7deg)" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Missing
        </p>
        <p className="mt-2 font-display text-3xl text-foreground/85">404</p>
      </div>
      <div
        aria-hidden
        className="absolute bottom-20 right-8 hidden rounded-[2rem] border border-border/60 bg-surface/60 px-5 py-4 shadow-sm backdrop-blur-xl lg:block"
        style={{ transform: "rotate(8deg)" }}
      >
        <p className="font-japanese text-2xl text-foreground/80">どこ？</p>
        <p className="mt-1 text-xs text-muted">Where did it go?</p>
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/75 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Lost scene
        </div>

        <div className="mt-8 w-full rounded-[2rem] border border-border bg-surface/70 px-6 py-8 shadow-sm backdrop-blur-xl sm:px-10 sm:py-10">
          <p className="font-mono text-xs text-muted">404</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            This page wandered off script.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {APP_NAME} looked everywhere, but this page is not in the current
            study set. Maybe it graduated. Maybe it never existed.
          </p>

          <div className="mt-7 flex justify-center">
            <div
              aria-hidden
              className="rounded-[1.75rem] border border-border/70 bg-background/50 px-5 py-4 shadow-sm"
              style={{ transform: "rotate(-2deg)" }}
            >
              <p className="font-display text-lg text-foreground/80">
                迷子のページ
              </p>
              <p className="mt-1 text-xs text-muted">A page that got lost.</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/70 bg-background/60 px-4 py-4">
            <p className="font-japanese text-xl text-foreground sm:text-2xl">
              このページは見つかりませんでした。
            </p>
            <p className="mt-1 text-sm text-muted">
              Kono peiji wa mitsukarimasen deshita.
            </p>
            <div className="mt-4 flex justify-center">
              <NotFoundAudioButton />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/today"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cta px-5 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90"
            >
              <Compass className="h-4 w-4" />
              Open app
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-raised"
            >
              <Home className="h-4 w-4" />
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
