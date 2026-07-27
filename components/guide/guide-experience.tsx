"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  CircleDot,
  Headphones,
  Mic2,
  Repeat2,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import {
  antiPatterns,
  brainLearning,
  dailyChecklist,
  difficultyLadder,
  howToSections,
  masterySignals,
  methodGuideHero,
  methodOverview,
  methodPurpose,
  starGuide,
  type GuideAccent,
} from "@/lib/content/method-guide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeIcon, modeBadgeStyles } from "@/components/ui/mode-icon";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const accentText: Record<GuideAccent, string> = {
  neutral: "text-foreground",
  meaning_check: "text-mode-meaning",
  listen_shadow: "text-mode-listen",
  active_recall: "text-mode-recall",
  return_review: "text-mode-recall",
  review: "text-mode-review",
};

const accentBorder: Record<GuideAccent, string> = {
  neutral: "border-foreground/20",
  meaning_check: "border-mode-meaning/55",
  listen_shadow: "border-mode-listen/55",
  active_recall: "border-mode-recall/55",
  return_review: "border-mode-recall/55",
  review: "border-mode-review/55",
};

const accentBg: Record<GuideAccent, string> = {
  neutral: "bg-foreground",
  meaning_check: "bg-mode-meaning",
  listen_shadow: "bg-mode-listen",
  active_recall: "bg-mode-recall",
  return_review: "bg-mode-recall",
  review: "bg-mode-review",
};

const stepIcons = [BookOpenCheck, Headphones, Mic2, Repeat2];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
      {children}
    </p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function GuidePanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-grain relative overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-lg",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GuideExperience() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="method-guide-page relative isolate overflow-hidden"
    >
      <div className="method-guide-field absolute inset-0" aria-hidden />
      <div className="method-guide-grain absolute inset-0" aria-hidden />
      <span
        className="method-guide-brush pointer-events-none absolute -right-8 top-14 text-[clamp(7rem,22vw,17rem)] text-foreground/[0.1]"
        aria-hidden
      >
        学
      </span>

      <div className="relative mx-auto w-full max-w-[1320px] px-5 pb-14 pt-6 sm:px-8 md:px-10 md:pb-20 md:pt-10">
        <motion.section variants={fadeUp} className="py-5 md:py-8">
          <GuidePanel className="p-5 md:p-7">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center">
              <div>
                <Eyebrow>{methodGuideHero.subtitle}</Eyebrow>
                <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
                  {methodGuideHero.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted md:text-base">
                  {methodGuideHero.intro}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="method-guide-cta">
                    <Link href="/today">
                      <span className="method-guide-cta-label">Start today</span>
                      <ArrowRight className="method-guide-cta-arrow h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="#daily-loop">See the loop</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/45 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  In this guide
                </p>
                <div className="mt-4 grid gap-3">
                  {difficultyLadder.steps.map((step, index) => {
                    const Icon = stepIcons[index] ?? CircleDot;
                    return (
                      <div key={step.step} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-background",
                            accentBg[step.accent]
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold text-foreground">
                            {step.step}
                          </p>
                          <p className="text-xs text-muted">{step.level}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </GuidePanel>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-5 grid gap-3 md:grid-cols-3">
          {methodPurpose.pillars.map((pillar) => (
            <GuidePanel key={pillar.title} className="p-5 md:p-6">
              <Sparkles className="h-5 w-5 text-mode-listen" />
              <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                {pillar.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {pillar.description}
              </p>
            </GuidePanel>
          ))}
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20 grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <Eyebrow>{methodGuideHero.subtitle}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">
              {methodPurpose.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
              {methodPurpose.intro}
            </p>
          </div>
          <GuidePanel className="method-guide-ink p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Core idea
            </p>
            <p className="mt-4 font-display text-2xl font-semibold text-white">
              Real sentences under useful pressure.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Understand first, shadow at native rhythm, then produce Japanese without
              looking. The app is designed around that loop.
            </p>
          </GuidePanel>
        </motion.section>

        <motion.section variants={fadeUp} id="daily-loop" className="mt-20 scroll-mt-20">
          <SectionHeader
            eyebrow="Daily rhythm"
            title={difficultyLadder.title}
            description={difficultyLadder.description}
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {difficultyLadder.steps.map((step, index) => {
              const Icon = stepIcons[index] ?? CircleDot;
              return (
                <GuidePanel
                  key={step.step}
                  className={cn("p-5", accentBorder[step.accent])}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-background",
                        accentBg[step.accent]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="outline">{step.level}</Badge>
                  </div>
                  <p className={cn("mt-6 text-sm font-semibold", accentText[step.accent])}>
                    0{index + 1}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-foreground">
                    {step.step}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">
                    {step.whatHappens}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.whyItWorks}
                  </p>
                </GuidePanel>
              );
            })}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20 grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <SectionHeader
            eyebrow="Why it works"
            title={brainLearning.title}
            description={brainLearning.intro}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {brainLearning.points.map((point) => (
              <GuidePanel key={point.title} className="p-5">
                <Brain className="h-5 w-5 text-mode-recall" />
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{point.body}</p>
              </GuidePanel>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20">
          <SectionHeader
            eyebrow="Your route"
            title={methodOverview.title}
            description={methodPurpose.intro}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {methodOverview.steps.map((step) => (
              <GuidePanel key={step.number} className="p-5 md:p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground font-display text-lg font-semibold text-background">
                  {step.number}
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </GuidePanel>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader
            eyebrow="Do this today"
            title="Dashboard checklist"
            description="Mirror your Dashboard plan and work top to bottom."
          />
          <div className="grid gap-3">
            {dailyChecklist.map((item) => (
              <Link key={item.step} href={item.href}>
                <GuidePanel className="p-4 transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <ModeIcon type={item.type} />
                      <span
                        className={cn(
                          "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          modeBadgeStyles[item.type]
                        )}
                      >
                        {item.step}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-snug text-muted">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted" />
                  </div>
                </GuidePanel>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20">
          <SectionHeader
            eyebrow="How to use it"
            title="Step-by-step practice"
            description="Use normal scenes for focused reps, then switch to narration scenes when you want connected audio and more context."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {howToSections.map((section) => (
              <GuidePanel
                key={section.id}
                id={section.id}
                className={cn("scroll-mt-24 p-5", accentBorder[section.accent])}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                      accentBg[section.accent]
                    )}
                  />
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {section.summary}
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-mode-review" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </GuidePanel>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <SectionHeader
              eyebrow="Signals"
              title="Know when to push or repeat"
              description="Concrete cues tied to what the app already tracks."
            />
            <GuidePanel className="mt-8 overflow-x-auto p-0">
              <div className="min-w-[620px] grid grid-cols-[0.7fr_1fr_1fr] gap-px bg-border text-xs">
                <div className="bg-surface-raised px-4 py-3 font-semibold text-muted">Signal</div>
                <div className="bg-surface-raised px-4 py-3 font-semibold text-mode-review">
                  You know it
                </div>
                <div className="bg-surface-raised px-4 py-3 font-semibold text-mode-weak">
                  Needs practice
                </div>
                {masterySignals.map((row) => (
                  <div key={row.signal} className="contents">
                    <div className="bg-surface px-4 py-4 font-semibold text-foreground">
                      {row.signal}
                    </div>
                    <div className="bg-surface px-4 py-4 text-muted">{row.knowIt}</div>
                    <div className="bg-surface px-4 py-4 text-muted">{row.needsPractice}</div>
                  </div>
                ))}
              </div>
            </GuidePanel>
          </div>

          <div>
            <SectionHeader eyebrow="Ratings" title="Star guide" />
            <div className="mt-8 grid gap-3">
              {starGuide.map((level) => (
                <GuidePanel key={level.stars} className="p-4">
                  <div className="flex gap-4">
                    <div className="flex shrink-0 items-center gap-0.5 pt-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            "h-4 w-4",
                            index < level.stars
                              ? "fill-mode-recall text-mode-recall"
                              : "text-border"
                          )}
                        />
                      ))}
                    </div>
                    <div>
                      <Badge variant="warning">{level.label}</Badge>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {level.description}
                      </p>
                    </div>
                  </div>
                </GuidePanel>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="mt-20">
          <GuidePanel className="method-guide-ink p-6 md:p-8">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start">
              <div>
                <Target className="h-6 w-6 text-white" />
                <h2 className="mt-5 font-display text-3xl font-semibold text-white">
                  {antiPatterns.title}
                </h2>
              </div>
              <ul className="grid gap-3">
                {antiPatterns.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/72">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mode-review" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GuidePanel>
        </motion.section>

        <motion.p variants={fadeUp} className="mt-12 text-center text-sm leading-relaxed text-muted">
          Method inspired by{" "}
          <a
            href="https://www.nll.coach/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Natural Language Learning
          </a>
          . Ready to start?{" "}
          <Link href="/today" className="font-medium text-foreground underline underline-offset-2">
            Go to Dashboard
          </Link>
          .
        </motion.p>
      </div>
    </motion.div>
  );
}
