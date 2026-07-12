"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useApp } from "@/components/providers/app-provider";
import { AppGate } from "@/components/layout/empty-state";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { DesktopPageHeader } from "@/components/layout/desktop-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { cn } from "@/lib/utils";

export function ProgressStatsDesktop() {
  const { dataset, progress, stats } = useApp();

  const metrics = useMemo(() => {
    const all = dataset ? getAllSentences(dataset) : new Map();
    const total = all.size;
    const mastered = Object.values(progress.sentences).filter((s) => s.rating === 5).length;
    const weak = Object.values(progress.sentences).filter(
      (s) => s.rating !== null && s.rating <= 2
    ).length;

    const avgDaysToMastery =
      stats.masteryEvents.length > 0
        ? Math.round(
            stats.masteryEvents.reduce((a, e) => a + e.daysToMastery, 0) /
              stats.masteryEvents.length
          )
        : null;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const modeTime: Record<string, number> = {};
    stats.modeSessions
      .filter((s) => new Date(s.startedAt).getTime() > weekAgo && s.endedAt)
      .forEach((s) => {
        modeTime[s.mode] = (modeTime[s.mode] ?? 0) + s.durationMs;
      });

    const modeChart = Object.entries(modeTime).map(([mode, ms]) => ({
      mode: mode.replace("_", " "),
      minutes: Math.round(ms / 60000),
    }));

    const weakTrend = stats.dailySnapshots.slice(-14).map((s) => ({
      date: s.date.slice(5),
      weak: s.weakCount,
    }));

    const activeThisWeek = stats.activeDays.filter(
      (d) => new Date(d).getTime() > weekAgo
    ).length;

    return {
      total,
      mastered,
      weak,
      avgDaysToMastery,
      completedBatches: progress.completedPathwayBatches.length,
      completedIslands: progress.completedIslands.length,
      modeChart,
      weakTrend,
      activeThisWeek,
    };
  }, [dataset, progress, stats]);

  return (
    <AppGate>
      <DesktopPageShell>
        <DesktopPageHeader title="Progress" subtitle="Meaningful study metrics" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard title="Mastered" value={`${metrics.mastered}/${metrics.total}`} accent="success" />
          <StatCard title="Weak" value={String(metrics.weak)} accent="destructive" />
          <StatCard
            title="Days to mastery"
            value={metrics.avgDaysToMastery !== null ? String(metrics.avgDaysToMastery) : "—"}
            accent="foreground"
          />
          <StatCard title="Batches done" value={String(metrics.completedBatches)} accent="listen" />
          <StatCard title="Islands done" value={String(metrics.completedIslands)} accent="meaning" />
        </div>

        <Card className="mt-4">
          <CardContent className="py-5">
            <p className="text-sm text-muted">Days active this week</p>
            <p className="font-display text-4xl font-bold text-foreground">
              {metrics.activeThisWeek}
            </p>
          </CardContent>
        </Card>

        {(metrics.modeChart.length > 0 || metrics.weakTrend.length > 1) && (
          <div className="mt-4 md:grid md:grid-cols-2 md:gap-4">
        {metrics.modeChart.length > 0 && (
          <Card className="mt-4 md:mt-0">
            <CardHeader>
              <CardTitle className="text-base">Time by mode</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.modeChart}>
                  <XAxis dataKey="mode" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="minutes" fill="var(--foreground)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {metrics.weakTrend.length > 1 && (
          <Card className="mt-4 md:mt-0">
            <CardHeader>
              <CardTitle className="text-base">Weak sentences trend</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.weakTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Line type="monotone" dataKey="weak" stroke="var(--destructive)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
          </div>
        )}
      </DesktopPageShell>
    </AppGate>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent: "foreground" | "success" | "destructive" | "listen" | "meaning";
}) {
  const accentMap = {
    foreground: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    listen: "text-mode-listen",
    meaning: "text-mode-meaning",
  };

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted">{title}</p>
        <p className={cn("font-display text-2xl font-bold", accentMap[accent])}>{value}</p>
      </CardContent>
    </Card>
  );
}
