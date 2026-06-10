import { getJob } from "@/lib/jobs";
import { isUnauthorizedError, requireAdminSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    id: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error,
    articleId: job.articleId,
    diagnostics: job.diagnostics,
    live: job.live,
    pauseInfo: job.pauseInfo,
    maxClaims: job.maxClaims,
    maxSearchRounds: job.maxSearchRounds,
  });
}
