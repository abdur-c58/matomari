import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getSceneExportJob } from "@/lib/services/scene-export-service";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";

type RouteContext = { params: Promise<{ key: string; jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const { jobId } = await context.params;
  const job = await getSceneExportJob(jobId, user.userId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let downloadUrl: string | null = null;
  if (job.status === "ready" && job.resultR2Key) {
    downloadUrl = await getSignedAudioUrl(job.resultR2Key);
  }

  return NextResponse.json({ job, downloadUrl });
}
