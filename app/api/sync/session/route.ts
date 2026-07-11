import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSupabaseServerConfigured } from "@/lib/env";
import { checkSyncTablesReady } from "@/lib/supabase/server-sync";

export async function GET() {
  const session = await auth();
  const tables = isSupabaseServerConfigured()
    ? await checkSyncTablesReady()
    : { ready: false, error: "Supabase is not configured" };

  return NextResponse.json({
    authenticated: Boolean(session?.user?.supabaseUserId),
    email: session?.user?.email ?? null,
    supabaseConfigured: isSupabaseServerConfigured(),
    tablesReady: tables.ready,
    tablesError: tables.error ?? null,
  });
}