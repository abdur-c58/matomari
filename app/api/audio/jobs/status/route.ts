import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { countPendingTtsJobs } from "@/lib/supabase/tts-jobs";

export async function GET() {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  try {
    const pending = await countPendingTtsJobs();
    return NextResponse.json({ pending });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status failed", pending: 0 },
      { status: 500 }
    );
  }
}
