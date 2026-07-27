"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminUserListItem } from "@/lib/admin/types";
import type { AppRole } from "@/lib/supabase/profiles-data";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function roleBadge(role: AppRole) {
  if (role === "admin") return <Badge variant="warning">admin</Badge>;
  if (role === "support") return <Badge variant="secondary">support</Badge>;
  return <Badge variant="outline">user</Badge>;
}

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AppRole | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load users");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted" htmlFor="admin-user-search">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="admin-user-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, name, or user id"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-40">
          <label className="text-xs font-medium text-muted" htmlFor="admin-role-filter">
            Role
          </label>
          <select
            id="admin-role-filter"
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole | "")}
            className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
          >
            <option value="">All roles</option>
            <option value="user">user</option>
            <option value="support">support</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 text-sm text-destructive">{error}</Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface-raised/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Signup</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-border/70 last:border-0 hover:bg-foreground/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {user.email ?? "(no email)"}
                      </Link>
                      <p className="text-xs text-muted">{user.displayName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(user.signupAt)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.effectiveTier === "pro" ||
                          user.effectiveTier === "plus"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {user.effectiveTier}
                      </Badge>
                      {user.subscriptionStatus !== "none" && (
                        <p className="mt-0.5 text-xs text-muted">{user.subscriptionStatus}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{roleBadge(user.role)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(user.lastActiveAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-muted">{users.length} user{users.length === 1 ? "" : "s"}</p>
    </div>
  );
}
