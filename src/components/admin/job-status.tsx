"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { JobLivePanel } from "@/components/admin/job-live-panel";
import { JobPausePanel } from "@/components/admin/job-pause-panel";
import { RunDiagnostics } from "@/components/admin/run-diagnostics";
import type { RunDiagnostics as RunDiagnosticsData } from "@/lib/pipeline/diagnostics";
import type { JobLive, PauseInfo } from "@/lib/pipeline/job-live";

type JobStatusValue = "pending" | "running" | "paused" | "succeeded" | "failed";
type JobStep =
  | "scraping"
  | "extracting"
  | "verifying"
  | "aggregating"
  | "assessing-claims"
  | "rewriting"
  | "saving"
  | "done";

export type JobState = {
  status: JobStatusValue;
  step: JobStep | null;
  progress: number;
  error: string | null;
  articleId: string | null;
  diagnostics: RunDiagnosticsData | null;
  live: JobLive | null;
  pauseInfo: PauseInfo | null;
  maxClaims: number | null;
  maxSearchRounds: number | null;
};

const POLL_INTERVAL_MS = 2000;

export function JobStatus({
  jobId,
  initial,
}: {
  jobId: string;
  initial: JobState;
}) {
  const t = useTranslations("admin.job");
  const [job, setJob] = useState<JobState>(initial);

  useEffect(() => {
    // A paused job won't change until the admin resumes it, but keep polling so
    // the page reflects a resume triggered from elsewhere; only terminal states
    // stop the loop.
    if (job.status === "succeeded" || job.status === "failed") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      if (res.ok) {
        setJob((await res.json()) as JobState);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [jobId, job.status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("status")}</span>
        <span className="font-medium">{t(`statuses.${job.status}`)}</span>
      </div>

      <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {job.step && (
        <p className="text-muted-foreground text-sm">{t(`steps.${job.step}`)}</p>
      )}

      {job.status === "paused" && job.pauseInfo && (
        <JobPausePanel
          jobId={jobId}
          pauseInfo={job.pauseInfo}
          maxClaims={job.maxClaims}
          maxSearchRounds={job.maxSearchRounds}
        />
      )}

      <JobLivePanel live={job.live} />

      {job.status === "failed" && job.error && (
        <p className="text-destructive text-sm">
          {t("error")}: {job.error}
        </p>
      )}

      {job.status === "succeeded" && job.articleId && (
        <Button asChild>
          <Link href={`/admin/articles/${job.articleId}`}>
            {t("viewArticle")}
          </Link>
        </Button>
      )}

      <RunDiagnostics diagnostics={job.diagnostics} />
    </div>
  );
}
