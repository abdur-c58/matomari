"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
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
} from "@/lib/content/method-guide";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GuideSection } from "@/components/guide/guide-section";
import { ChecklistItem } from "@/components/guide/checklist-item";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function MethodGuideMobile() {
  return (
    <PageShell className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PageHeader title={methodGuideHero.title} subtitle="Method guide" backHref="/settings" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        <motion.p variants={fadeUp} className="text-base text-muted leading-relaxed">
          {methodGuideHero.intro}
        </motion.p>

        <motion.div variants={fadeUp}>
          <GuideSection title={methodPurpose.title}>
            <p className="mb-5 text-sm text-muted leading-relaxed">{methodPurpose.intro}</p>
            <div className="space-y-3">
              {methodPurpose.pillars.map((pillar) => (
                <Card key={pillar.title} variant="default" className="p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground">{pillar.title}</h3>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed">
                    {pillar.description}
                  </p>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection title={brainLearning.title} accent="active_recall">
            <p className="mb-5 text-sm text-muted leading-relaxed">{brainLearning.intro}</p>
            <div className="space-y-3">
              {brainLearning.points.map((point) => (
                <Card key={point.title} variant="default" className="p-4 sm:p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed">{point.body}</p>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection
            title={difficultyLadder.title}
            description={difficultyLadder.description}
            accent="listen_shadow"
          >
            <div className="space-y-3">
              {difficultyLadder.steps.map((step, index) => (
                <Card key={step.step} variant="default" className="overflow-hidden p-0">
                  <div
                    className={cn(
                      "border-l-4 p-4 sm:p-5",
                      step.accent === "meaning_check"
                        ? "border-l-mode-meaning"
                        : step.accent === "listen_shadow"
                          ? "border-l-mode-listen"
                          : step.accent === "active_recall"
                            ? "border-l-mode-recall"
                            : "border-l-mode-review"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground">
                        {index + 1}
                      </span>
                      <h3 className="font-display font-semibold text-foreground">{step.step}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {step.level}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground leading-relaxed">
                      {step.whatHappens}
                    </p>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{step.whyItWorks}</p>
                  </div>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection title={methodOverview.title}>
            <div className="space-y-3">
              {methodOverview.steps.map((step) => (
                <Card key={step.number} variant="default" className="p-4">
                  <div className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection
            title="Daily checklist"
            description="Mirror your Today plan — work top to bottom."
            accent="meaning_check"
          >
            <div className="space-y-3">
              {dailyChecklist.map((item) => (
                <ChecklistItem key={item.step} item={item} />
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection title="Step-by-step how-to">
            <div className="space-y-3">
              {howToSections.map((section) => (
                <Card key={section.id} id={section.id} variant="default" className="overflow-hidden scroll-mt-24 p-0">
                  <div
                    className={cn(
                      "border-l-4 p-4",
                      section.accent === "neutral"
                        ? "border-l-foreground"
                        : section.accent === "meaning_check"
                          ? "border-l-mode-meaning"
                          : section.accent === "listen_shadow"
                            ? "border-l-mode-listen"
                            : section.accent === "active_recall"
                              ? "border-l-mode-recall"
                              : "border-l-mode-review"
                    )}
                  >
                    <h3 className="font-display font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{section.summary}</p>
                    <ul className="mt-3 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2 text-sm text-foreground leading-relaxed"
                        >
                          <span className="text-muted">·</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection
            title="When you know it vs need more practice"
            description="Concrete signals tied to what the app tracks."
            accent="active_recall"
          >
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-border text-xs font-medium">
                <div className="bg-surface-raised px-3 py-2 text-muted">Signal</div>
                <div className="bg-surface-raised px-3 py-2 text-mode-review">You know it</div>
                <div className="bg-surface-raised px-3 py-2 text-mode-weak">Needs practice</div>
                {masterySignals.map((row) => (
                  <div key={row.signal} className="contents">
                    <div className="bg-surface px-3 py-3 font-medium text-foreground">
                      {row.signal}
                    </div>
                    <div className="bg-surface px-3 py-3 text-muted">{row.knowIt}</div>
                    <div className="bg-surface px-3 py-3 text-muted">{row.needsPractice}</div>
                  </div>
                ))}
              </div>
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection title="Star rating guide" accent="review">
            <div className="space-y-3">
              {starGuide.map((level) => (
                <Card key={level.stars} variant="default" className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < level.stars
                              ? "fill-mode-recall text-mode-recall"
                              : "text-border"
                          )}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">{level.label}</Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-muted leading-relaxed">
                        {level.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GuideSection title={antiPatterns.title}>
            <Card variant="default" className="p-4">
              <ul className="space-y-3">
                {antiPatterns.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted leading-relaxed">
                    <span className="text-foreground">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </GuideSection>
        </motion.div>

        <motion.div variants={fadeUp}>
          <p className="text-center text-sm text-muted leading-relaxed">
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
            <Link href="/" className="font-medium text-foreground underline underline-offset-2">
              Go to Today
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
