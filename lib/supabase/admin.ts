import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";

function ensureNodeWebSocket(): void {
  if (typeof WebSocket !== "undefined") return;
  if (typeof process === "undefined" || !process.versions?.node) return;

  try {
    const { WebSocket: NodeWebSocket } = require("ws") as typeof import("ws");
    (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
      NodeWebSocket as unknown as typeof WebSocket;
  } catch {
    // Node 22+ has native WebSocket; older Node needs the optional `ws` package.
  }
}

export function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;

  ensureNodeWebSocket();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
