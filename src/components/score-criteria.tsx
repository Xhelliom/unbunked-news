import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  SCORE_CRITERIA,
  criterionValue,
  scoreBand,
  type CriterionScores,
} from "@/lib/score-criteria";
import { verdictDotClasses } from "@/lib/verdicts";

// Renders the three sub-scores (factuality, sourcing, neutrality) as labelled,
// verdict-coloured progress bars, each with a hover/focus tooltip explaining
// what the criterion measures. Rows with a missing score are skipped.
export function ScoreCriteria({ scores }: { scores: CriterionScores }) {
  const t = useTranslations("criteria");

  const rows = SCORE_CRITERIA.map((criterion) => ({
    criterion,
    value: criterionValue(scores, criterion),
  })).filter((row): row is { criterion: typeof row.criterion; value: number } =>
    row.value !== null,
  );

  if (rows.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold">{t("sectionTitle")}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{t("sectionHint")}</p>
      <dl className="mt-3 space-y-2.5">
      {rows.map(({ criterion, value }) => (
        <div
          key={criterion}
          className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3"
        >
          <dt className="flex items-center gap-1 text-sm font-medium">
            {t(`${criterion}.label`)}
            <span className="group/tip relative inline-flex">
              <Info
                tabIndex={0}
                aria-label={t(`${criterion}.description`)}
                className="text-muted-foreground/60 hover:text-muted-foreground size-3.5 cursor-help outline-none"
              />
              <span
                role="tooltip"
                className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-52 rounded-md border px-2.5 py-1.5 text-xs leading-snug opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
              >
                {t(`${criterion}.description`)}
              </span>
            </span>
          </dt>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full", verdictDotClasses[scoreBand(value)])}
              style={{ width: `${value}%` }}
            />
          </div>
          <dd className="text-right font-mono text-sm tabular-nums">{value}</dd>
        </div>
      ))}
      </dl>
    </div>
  );
}
