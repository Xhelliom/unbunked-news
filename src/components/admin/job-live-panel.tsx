"use client";

import { Fragment } from "react";

import { useTranslations } from "next-intl";

import type { JobLive } from "@/lib/pipeline/job-live";

// Live, polled snapshot of the in-flight run. Only the numbers a phase has
// already produced are shown, so the panel fills in as the analysis advances.
export function JobLivePanel({ live }: { live: JobLive | null }) {
  const t = useTranslations("admin.job.live");
  const tVerdict = useTranslations("verdicts");

  if (!live) return null;

  const rows: { label: string; value: string }[] = [];
  if (live.contentChars !== undefined) {
    rows.push({
      label: t("contentChars"),
      value: t("chars", { count: live.contentChars }),
    });
  }
  if (live.claimsExtracted !== undefined) {
    rows.push({ label: t("claimsExtracted"), value: String(live.claimsExtracted) });
  }
  if (live.verifyRound !== undefined) {
    rows.push({
      label: t("verifyRound"),
      value: live.verifyRoundsMax
        ? `${live.verifyRound} / ${live.verifyRoundsMax}`
        : String(live.verifyRound),
    });
  }
  if (live.sourcesFound !== undefined) {
    rows.push({ label: t("sourcesFound"), value: String(live.sourcesFound) });
  }
  if (live.verdict) {
    rows.push({ label: t("verdict"), value: tVerdict(`${live.verdict}.label`) });
  }
  if (live.reliabilityScore !== undefined && live.reliabilityScore !== null) {
    rows.push({
      label: t("reliabilityScore"),
      value: `${live.reliabilityScore} / 100`,
    });
  }
  if (live.claimsAssessed !== undefined) {
    rows.push({ label: t("claimsAssessed"), value: String(live.claimsAssessed) });
  }
  if (live.rewriteLocalesDone !== undefined) {
    rows.push({
      label: t("rewriteLocalesDone"),
      value: String(live.rewriteLocalesDone),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-secondary/40 space-y-2 rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {t("title")}
      </p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular-nums">{row.value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
