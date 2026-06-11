import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getJob } from "@/lib/jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatus, type JobState } from "@/components/admin/job-status";

export default async function AdminJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    notFound();
  }

  const t = await getTranslations("admin.job");
  const initial: JobState = {
    status: job.status,
    step: job.step as JobState["step"],
    progress: job.progress,
    error: job.error,
    articleId: job.articleId,
    diagnostics: job.diagnostics ?? null,
    live: job.live ?? null,
    pauseInfo: job.pauseInfo ?? null,
    maxClaims: job.maxClaims,
    maxSearchRounds: job.maxSearchRounds,
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <JobStatus jobId={id} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
