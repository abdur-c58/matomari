"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type AdminUserDetail } from "@/lib/admin/types";
import type { AppRole } from "@/lib/supabase/profiles-data";
import { AdminSubscriptionControls } from "@/components/admin/admin-subscription-controls";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AdminUserDetailScreen({ userId }: { userId: string }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [meRole, setMeRole] = useState<AppRole | null>(null);
  const [meCanGrantSubscriptions, setMeCanGrantSubscriptions] = useState(false);
  const [meIsGrantOwner, setMeIsGrantOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [savingGrantCapability, setSavingGrantCapability] = useState(false);
  const [nextRole, setNextRole] = useState<AppRole>("user");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, meRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch("/api/admin/me"),
      ]);
      const userData = await userRes.json();
      const meData = await meRes.json();
      if (!userRes.ok) throw new Error(userData.error ?? "Failed to load user");
      if (!meRes.ok) throw new Error(meData.error ?? "Failed to load session");
      setUser(userData.user);
      setNextRole(userData.user.role);
      setMeRole(meData.role);
      setMeCanGrantSubscriptions(Boolean(meData.canGrantSubscriptions));
      setMeIsGrantOwner(Boolean(meData.isSubscriptionGrantOwner));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRole() {
    if (!user || meRole !== "admin") return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Role update failed");
      toast.success(`Role updated to ${nextRole}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setSavingRole(false);
    }
  }

  async function saveGrantCapability(enabled: boolean) {
    if (!user || !meIsGrantOwner) return;
    setSavingGrantCapability(true);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/subscription-grant-capability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Capability update failed");
      toast.success(
        enabled
          ? "Subscription-granting power enabled"
          : "Subscription-granting power removed"
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Capability update failed");
    } finally {
      setSavingGrantCapability(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading user…</p>;
  }

  if (error || !user) {
    return (
      <div className="space-y-3">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
        <Card className="border-destructive/30 text-sm text-destructive">
          {error ?? "User not found"}
        </Card>
      </div>
    );
  }

  const isAdmin = meRole === "admin";

  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {user.email ?? "(no email)"}
        </h2>
        <p className="text-sm text-muted">
          {user.displayName} · <span className="font-mono text-xs">{user.userId}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Role</dt>
              <dd>
                <Badge variant={user.role === "admin" ? "warning" : "outline"}>
                  {user.role}
                </Badge>
                {user.canGrantSubscriptions && (
                  <Badge className="ml-2" variant="secondary">
                    can grant subscriptions
                  </Badge>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Signup</dt>
              <dd>{formatDate(user.signupAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Last active</dt>
              <dd>{formatDate(user.lastActiveAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Subscription</dt>
              <dd>
                  <Badge
                    variant={
                      user.effectiveTier === "pro" || user.effectiveTier === "plus"
                        ? "warning"
                        : "outline"
                    }
                  >
                  {user.effectiveTier}
                </Badge>
                <span className="ml-2 text-xs text-muted">
                  {user.subscriptionStatus}
                  {user.cancelAtPeriodEnd ? " · cancel at period end" : ""}
                </span>
              </dd>
            </div>
            {user.currentPeriodEnd && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Period end</dt>
                <dd>{formatDate(user.currentPeriodEnd)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Usage</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Scenes</dt>
              <dd>{user.usage.sceneCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Sentences</dt>
              <dd>{user.usage.sentenceCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Storage used</dt>
              <dd>
                {user.usage.storageBytes == null
                  ? "Not tracked yet"
                  : `${Math.round(user.usage.storageBytes / 1024)} KB`}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            Counts come from synced library data. Per-user storage caps are not in the schema yet.
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Actions</h3>

        {isAdmin ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5 sm:w-48">
              <label className="text-xs font-medium text-muted" htmlFor="role-select">
                Change role
              </label>
              <select
                id="role-select"
                value={nextRole}
                onChange={(e) => setNextRole(e.target.value as AppRole)}
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
              >
                <option value="user">user</option>
                <option value="support">support</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <Button
              type="button"
              onClick={() => void saveRole()}
              loading={savingRole}
              disabled={nextRole === user.role}
            >
              Save role
            </Button>
            {meIsGrantOwner && (
              <Button
                type="button"
                variant="secondary"
                loading={savingGrantCapability}
                disabled={user.role !== "admin"}
                onClick={() =>
                  void saveGrantCapability(!user.canGrantSubscriptions)
                }
              >
                {user.canGrantSubscriptions
                  ? "Remove grant power"
                  : "Allow subscription grants"}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Role changes require the admin role.</p>
        )}

        {meIsGrantOwner && (
          <p className="text-xs text-muted">
            Only you can assign subscription-granting power, and only to admins.
          </p>
        )}

        <Separator />

        <AdminSubscriptionControls
          user={user}
          canGrantSubscriptions={meCanGrantSubscriptions}
          onUpdated={load}
        />
      </Card>
    </div>
  );
}
