import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { countPendingTtsJobs } from "@/lib/supabase/tts-jobs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
