import type { Verdict } from "@/lib/verdicts";

// The criteria that decompose the overall reliability score. Kept here as the
// single source of truth: the DB columns, the pipeline tool schema, the admin
// form and the public UI all derive from these lists.
//
// Core criteria are always assessable and the AI must score them. Optional
// criteria depend on the article (author/funding disclosure, recency, …) and
// may be absent (null) when they can't be judged reliably.
export const CORE_CRITERIA = ["factuality", "sourcing", "neutrality"] as const;
export const OPTIONAL_CRITERIA = [
  "completeness",
  "transparency",
  "recency",
] as const;
export const SCORE_CRITERIA = [...CORE_CRITERIA, ...OPTIONAL_CRITERIA] as const;

export type CoreCriterion = (typeof CORE_CRITERIA)[number];
export type OptionalCriterion = (typeof OPTIONAL_CRITERIA)[number];
export type ScoreCriterion = (typeof SCORE_CRITERIA)[number];

// A criterion at or below this value is surfaced as a warning badge on feed
// cards (e.g. "Neutralité faible").
export const LOW_CRITERION_THRESHOLD = 40;

// Structural shape of the criterion columns on an article row. Matches the
// nullable integer columns added in the articles table.
export type CriterionScores = {
  factualityScore: number | null;
  sourcingScore: number | null;
  neutralityScore: number | null;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
};

// Maps each criterion to its article/DB column. Reused for reading scores and
// for naming the admin form fields, so the wire and the schema never drift.
export const CRITERION_COLUMN: Record<ScoreCriterion, keyof CriterionScores> = {
  factuality: "factualityScore",
  sourcing: "sourcingScore",
  neutrality: "neutralityScore",
  completeness: "completenessScore",
  transparency: "transparencyScore",
  recency: "recencyScore",
};

export function isOptionalCriterion(
  criterion: ScoreCriterion,
): criterion is OptionalCriterion {
  return (OPTIONAL_CRITERIA as readonly string[]).includes(criterion);
}

export function criterionValue(
  scores: CriterionScores,
  criterion: ScoreCriterion,
): number | null {
  return scores[CRITERION_COLUMN[criterion]];
}

// Maps a 0-100 sub-score to the verdict colour family used for its progress
// bar, reusing the same bands the editor guidelines apply to the overall score.
export function scoreBand(score: number): Verdict {
  if (score >= 85) return "reliable";
  if (score >= 60) return "nuanced";
  if (score >= 40) return "biased";
  return "debunked";
}

// The lowest criterion that falls below the warning threshold, or null when all
// scored criteria are healthy. Absent (null) criteria are ignored. Used by feed
// cards to flag a weak article.
export function lowestWeakCriterion(
  scores: CriterionScores,
): ScoreCriterion | null {
  let weakest: { criterion: ScoreCriterion; value: number } | null = null;
  for (const criterion of SCORE_CRITERIA) {
    const value = criterionValue(scores, criterion);
    if (value === null || value >= LOW_CRITERION_THRESHOLD) continue;
    if (!weakest || value < weakest.value) {
      weakest = { criterion, value };
    }
  }
  return weakest?.criterion ?? null;
}
