"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HealthPayload = {
  totalUsers: number;
  staffUsers: number;
  usersWithDatasets: number;
  usersActiveLast7Days: number;
  billingLive: false;
  mrrEstimate: null;
  errorRateOverview: null;
  apiCostTracking: null;
  billing: {
    live: false;
    paddle: false;
    message: string;
  };
};

export function AdminHealthScreen() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load health");
      setHealth(data.health);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !health) {
    return <p className="text-sm text-muted">Loading system health…</p>;
  }

  if (error) {
    return <Card className="border-destructive/30 text-sm text-destructive">{error}</Card>;
  }

  if (!health) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Admin-only aggregate stats from live tables.</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={health.totalUsers} />
        <StatCard label="Staff accounts" value={health.staffUsers} />
        <StatCard label="Users with datasets" value={health.usersWithDatasets} />
        <StatCard label="Active (7d progress sync)" value={health.usersActiveLast7Days} />
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Billing & observability</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Billing live</dt>
            <dd>
              <Badge variant="outline">No</Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">MRR estimate</dt>
            <dd className="text-muted">Unavailable — not computed yet</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Error rate overview</dt>
            <dd className="text-muted">No error telemetry table yet</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">API cost tracking</dt>
            <dd className="text-muted">Not logged in-app yet</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">{health.billing.message}</p>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}
