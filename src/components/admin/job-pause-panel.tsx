"use client";

import { useTranslations } from "next-intl";

import { resumeJob } from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PauseInfo } from "@/lib/pipeline/job-live";
import {
  MAX_CLAIMS_CEILING,
  MAX_SEARCH_ROUNDS_CEILING,
} from "@/lib/pipeline/limits";

type Props = {
  jobId: string;
  pauseInfo: PauseInfo;
  maxClaims: number | null;
  maxSearchRounds: number | null;
};

// Shown when the preflight gate paused a long-article run. The admin adjusts the
// claim/search budget (pre-filled with the suggestions) and resumes, or keeps
// the suggested values. resumeJob clamps and re-queues the job.
export function JobPausePanel({
  jobId,
  pauseInfo,
  maxClaims,
  maxSearchRounds,
}: Props) {
  const t = useTranslations("admin.job.pause");
  const claimsDefault = maxClaims ?? pauseInfo.suggestedMaxClaims;
  const roundsDefault = maxSearchRounds ?? pauseInfo.suggestedMaxSearchRounds;

  return (
    <form
      action={resumeJob}
      className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <input type="hidden" name="id" value={jobId} />
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("title")}</p>
        <p className="text-muted-foreground text-sm">
          {t("description", {
            contentChars: pauseInfo.contentChars,
            truncateAt: pauseInfo.truncateAt,
          })}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="maxClaims" className="text-sm font-medium">
            {t("maxClaims")}
          </label>
          <Input
            id="maxClaims"
            name="maxClaims"
            type="number"
            min={1}
            max={MAX_CLAIMS_CEILING}
            defaultValue={claimsDefault}
          />
          <p className="text-muted-foreground text-xs">
            {t("defaultHint", { value: pauseInfo.defaultMaxClaims })}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="maxSearchRounds" className="text-sm font-medium">
            {t("maxSearchRounds")}
          </label>
          <Input
            id="maxSearchRounds"
            name="maxSearchRounds"
            type="number"
            min={1}
            max={MAX_SEARCH_ROUNDS_CEILING}
            defaultValue={roundsDefault}
          />
          <p className="text-muted-foreground text-xs">
            {t("defaultHint", { value: pauseInfo.defaultMaxSearchRounds })}
          </p>
        </div>
      </div>
      <Button type="submit" size="sm">
        {t("resume")}
      </Button>
    </form>
  );
}
