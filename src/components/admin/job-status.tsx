"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type JobStatusValue = "pending" | "running" | "succeeded" | "failed";
type JobStep =
  | "scraping"
  | "extracting"
  | "verifying"
  | "aggregating"
  | "saving"
  | "done";

export type JobState = {
  status: JobStatusValue;
  step: JobStep | null;
  progress: number;
  error: string | null;
  articleId: string | null;
};

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
    if (job.status === "succeeded" || job.status === "failed") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      if (res.ok) {
        setJob((await res.json()) as JobState);
      }
    }, 2000);
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
    </div>
  );
}
