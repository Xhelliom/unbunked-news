import { FALLBACK_RUBRIC, type Rubric } from "./rubrics";

// One-off heuristic for the rubric migration: the retired open-tag vocabulary
// maps onto the fixed taxonomy. Only the historically-seeded tag slugs are
// mapped explicitly; anything unknown falls back to `societe` (the catch-all)
// and should be reviewed by an editor. Keys are tag slugs (slugified labels).
export const TAG_RUBRIC_MAP: Record<string, Rubric> = {
  politics: "politique",
  economy: "economie-social",
  environment: "ecologie",
  health: "sciences-sante",
  tech: "sciences-sante",
};

// Picks a rubric for an article from its (ordered) tag slugs: the first slug
// with an explicit mapping wins; with no mappable tag we use the fallback.
export function rubricForTagSlugs(slugs: readonly string[]): Rubric {
  for (const slug of slugs) {
    const mapped = TAG_RUBRIC_MAP[slug];
    if (mapped) return mapped;
  }
  return FALLBACK_RUBRIC;
}
