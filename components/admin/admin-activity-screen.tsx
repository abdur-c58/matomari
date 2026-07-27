"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminActionType, AdminAuditLogRow } from "@/lib/supabase/admin-data";

const ACTION_OPTIONS: Array<AdminActionType | ""> = [
  "",
  "role_change",
  "comp_access",
  "revoke_access",
  "refund_issued",
  "subscription_override",
];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AdminActivityScreen() {
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState<AdminActionType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actor.trim()) params.set("actor", actor.trim());
      if (action) params.set("action", action);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load activity");
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [actor, action, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Read-only audit trail of staff actions. Admin role only.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted" htmlFor="audit-actor">
            Actor user id
          </label>
          <Input
            id="audit-actor"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted" htmlFor="audit-action">
            Action type
          </label>
          <select
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value as AdminActionType | "")}
            className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "All actions"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted" htmlFor="audit-from">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted" htmlFor="audit-to">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <Button type="button" variant="secondary" onClick={() => void load()} loading={loading}>
        Apply filters
      </Button>

      {error && (
        <Card className="border-destructive/30 text-sm text-destructive">{error}</Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-surface-raised/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Loading activity…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No audit events match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/70 align-top last:border-0"
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{log.actionType}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.actorUserId}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.targetUserId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted">
                        {JSON.stringify(log.details, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
