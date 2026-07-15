import { NextResponse } from "next/server";
import { runTtsWorkerBatch } from "@/lib/audio/tts-worker";
import { countPendingTtsJobs } from "@/lib/supabase/tts-jobs";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Allow in local/dev when unset; require in production.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(
    40,
    Math.max(1, Number(limitRaw) || 8)
  );

  try {
    const result = await runTtsWorkerBatch(limit);
    const pending = await countPendingTtsJobs();
    return NextResponse.json({ ...result, pending });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Worker failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
