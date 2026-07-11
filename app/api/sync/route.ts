import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SyncTable } from "@/lib/repositories/types";
import {
  fetchRemoteDatasetAdmin,
  fetchRemoteProgressAdmin,
  fetchRemoteStatsAdmin,
  pushRemoteDataAdmin,
  checkSyncTablesReady,
} from "@/lib/supabase/server-sync";

type PushItem = {
  table: SyncTable;
  payload: unknown;
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

  for (const item of items) {
    const result = await pushRemoteDataAdmin(userId, item.table, item.payload);
    results.push({ table: item.table, ok: result.ok, error: result.error });
    if (!result.ok) lastError = result.error;
  }

  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results, error: lastError }, { status: ok ? 200 : 502 });
}
