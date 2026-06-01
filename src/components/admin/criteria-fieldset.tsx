"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  CRITERION_COLUMN,
  NEUTRAL_SCORE,
  SCORE_CRITERIA,
  criterionValue,
  isConditionalCriterion,
  scoreBand,
  type CriterionScores,
  type ScoreCriterion,
} from "@/lib/score-criteria";
import { verdictDotClasses } from "@/lib/verdicts";

// The six criterion sliders with a live verdict-coloured preview. Optional
// criteria carry a checkbox; when unchecked their slider is disabled and thus
// omitted from the form data, which the save action reads back as "unscored"
// (null). Lives inside the review form's <form>, so the named range inputs are
// submitted with the rest. Initial state is read once; remount (the form is
// keyed by article id) resets it.
export function CriteriaFieldset({ initial }: { initial: CriterionScores }) {
  const t = useTranslations("admin.review");
  const tc = useTranslations("criteria");

  const [scores, setScores] = useState<Record<ScoreCriterion, number>>(
    () =>
      Object.fromEntries(
        SCORE_CRITERIA.map((criterion) => [
          criterion,
          criterionValue(initial, criterion) ?? NEUTRAL_SCORE,
        ]),
      ) as Record<ScoreCriterion, number>,
  );
  // Core criteria are always scored; only the conditional ones (recency) carry
  // a checkbox and can be toggled off (omitted → null).
  const [enabled, setEnabled] = useState<Record<ScoreCriterion, boolean>>(
    () =>
      Object.fromEntries(
        SCORE_CRITERIA.map((criterion) => [
          criterion,
          isConditionalCriterion(criterion)
            ? criterionValue(initial, criterion) !== null
            : true,
        ]),
      ) as Record<ScoreCriterion, boolean>,
  );

  const isScored = (criterion: ScoreCriterion): boolean =>
    !isConditionalCriterion(criterion) || enabled[criterion];

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t("criteriaTitle")}</legend>
      <p className="text-muted-foreground text-xs">{t("criteriaHint")}</p>
      {SCORE_CRITERIA.map((criterion) => {
        const optional = isConditionalCriterion(criterion);
        const on = isScored(criterion);
        const value = scores[criterion];
        const field = CRITERION_COLUMN[criterion];
        return (
          <div key={criterion} className="space-y-1.5">
            <div className="flex items-center gap-2">
              {optional && (
                <input
                  type="checkbox"
                  checked={enabled[criterion]}
                  aria-label={tc(`${criterion}.label`)}
                  onChange={(event) =>
                    setEnabled((current) => ({
                      ...current,
                      [criterion]: event.target.checked,
                    }))
                  }
                />
              )}
              <label
                htmlFor={field}
                className={cn(
                  "text-sm font-medium",
                  !on && "text-muted-foreground",
                )}
              >
                {tc(`${criterion}.label`)}
                {optional && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {t("optional")}
                  </span>
                )}
              </label>
              <span className="ml-auto font-mono text-sm tabular-nums">
                {on ? value : "—"}
              </span>
            </div>
            <input
              id={field}
              name={field}
              type="range"
              min={0}
              max={100}
              value={value}
              disabled={!on}
              onChange={(event) =>
                setScores((current) => ({
                  ...current,
                  [criterion]: Number(event.target.value),
                }))
              }
              className="w-full disabled:opacity-40"
            />
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  on
                    ? verdictDotClasses[scoreBand(value)]
                    : "bg-muted-foreground/30",
                )}
                style={{ width: `${on ? value : 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
