"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/app-provider";
import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SentenceCard } from "@/components/sentence/sentence-card";
import { analyzeTranscript, findStudyCandidates } from "@/lib/services/pre-input-service";
import { fadeUp, staggerContainer } from "@/lib/motion";

export function PreInputHelper() {
  const { dataset } = useApp();
  const [transcript, setTranscript] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const unknown = analyzed ? analyzeTranscript(transcript, dataset) : [];
  const candidates = analyzed && dataset ? findStudyCandidates(transcript, dataset) : [];

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzed(true);
      setAnalyzing(false);
    }, 400);
  };

  return (
    <AppGate>
      <PageShell>
        <PageHeader
          title="Pre-study"
          subtitle="Before watching native content"
          backHref="/"
        />

        <Textarea
          placeholder="Paste YouTube transcript or Japanese text..."
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            setAnalyzed(false);
          }}
          className="min-h-[140px]"
        />

        <Button
          className="mt-4 w-full"
          onClick={handleAnalyze}
          disabled={!transcript.trim() || analyzing}
          loading={analyzing}
        >
          Analyze transcript
        </Button>

        {analyzing && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {analyzed && !analyzing && (
          <motion.div
            className="mt-6 space-y-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">
                Unknown phrases ({unknown.length})
              </h2>
              {unknown.length === 0 ? (
                <Card className="p-4 text-muted">
                  You likely know most of this content!
                </Card>
              ) : (
                unknown.slice(0, 20).map((u) => (
                  <motion.div key={u.text} variants={fadeUp} className="mb-2">
                    <Card className="p-4">
                      <p className="font-japanese text-lg">{u.text}</p>
                      {u.matchingSentences[0] && (
                        <p className="mt-1 text-sm text-muted">
                          Related: {u.matchingSentences[0].english}
                        </p>
                      )}
                    </Card>
                  </motion.div>
                ))
              )}
            </section>

            {candidates.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold">
                  Suggested to study
                </h2>
                {candidates.slice(0, 8).map((s) => (
                  <motion.div key={s.id} variants={fadeUp} className="mb-2">
                    <SentenceCard sentence={s} variant="compact" />
                  </motion.div>
                ))}
              </section>
            )}
          </motion.div>
        )}
      </PageShell>
    </AppGate>
  );
}
