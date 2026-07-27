import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SyncTable } from "@/lib/repositories/types";
import {
  fetchRemoteDatasetAdmin,
  fetchRemoteProgressAdmin,
  fetchRemoteStatsAdmin,
  pushRemoteDataAdmin,
} from "@/lib/supabase/server-sync";
import {
  assertLibraryWithinEntitlements,
  EntitlementError,
  getEffectiveEntitlements,
} from "@/lib/services/entitlements-service";

type PushItem = {
  table: SyncTable;
  payload: unknown;
  expectedRevision?: number | null;
};

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const [dataset, progress, stats] = await Promise.all([
    fetchRemoteDatasetAdmin(userId),
    fetchRemoteProgressAdmin(userId),
    fetchRemoteStatsAdmin(userId),
  ]);

  return NextResponse.json({
    dataset,
    progress,
    stats,
    localMeta: {
      datasetUpdatedAt: searchParams.get("datasetUpdatedAt"),
      progressUpdatedAt: searchParams.get("progressUpdatedAt"),
      statsUpdatedAt: searchParams.get("statsUpdatedAt"),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { items?: PushItem[] };
  const items = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const results: Array<{ table: SyncTable; ok: boolean; error?: string }> = [];
  let lastError: string | undefined;
  let conflict = false;
  let forbidden = false;

  let entitlements: Awaited<ReturnType<typeof getEffectiveEntitlements>> | null =
    null;

  for (const item of items) {
    if (item.table === "user_datasets") {
      try {
        entitlements ??= await getEffectiveEntitlements(userId);
        assertLibraryWithinEntitlements(item.payload, entitlements.caps);
      } catch (err) {
        const message =
          err instanceof EntitlementError
            ? err.message
            : "Entitlement check failed";
        results.push({ table: item.table, ok: false, error: message });
        lastError = message;
        forbidden = true;
        continue;
      }
    }

    const result = await pushRemoteDataAdmin(userId, item.table, item.payload, {
      expectedRevision: item.expectedRevision,
    });
    results.push({ table: item.table, ok: result.ok, error: result.error });
    if (!result.ok) {
      lastError = result.error;
      if (result.conflict) conflict = true;
    }
  }

  const ok = results.every((result) => result.ok);
  return NextResponse.json(
    { ok, results, error: lastError, conflict },
    { status: ok ? 200 : forbidden ? 403 : conflict ? 409 : 502 }
  );
}
