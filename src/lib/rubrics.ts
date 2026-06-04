// Fixed, closed editorial taxonomy: exactly one rubric per article. Unlike the
// retired open `tags` cloud, this list is curated and never grows from AI output.
// Slugs are the enum values stored in `articles.rubric`; labels are i18n
// (messages `rubrics.<slug>.label`), mirroring how verdicts are handled.
// Display order here is the order shown in the home nav.
export const RUBRICS = [
  "france",
  "international",
  "politique",
  "economie-social",
  "ecologie",
  "sciences-sante",
  "culture-idees",
  "societe",
] as const;

export type Rubric = (typeof RUBRICS)[number];

// Catch-all used when no other rubric applies (backfill fallback, AI fallback).
export const FALLBACK_RUBRIC: Rubric = "societe";

export function isRubric(value: unknown): value is Rubric {
  return (
    typeof value === "string" && (RUBRICS as readonly string[]).includes(value)
  );
}
