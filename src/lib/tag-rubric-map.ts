import { FALLBACK_RUBRIC, type Rubric } from "./rubrics";

// One-off heuristic for the rubric migration: the retired open-tag vocabulary
// maps onto the fixed taxonomy. The historical tag cloud is bilingual (English
// and French slugs coexist, e.g. `environment`/`environnement`), so both spellings
// are mapped here; anything unknown falls back to `societe` (the catch-all) and
// should be reviewed by an editor. Keys are tag slugs (slugified labels).
export const TAG_RUBRIC_MAP: Record<string, Rubric> = {
  politics: "politique",
  economy: "economie-social",
  environment: "ecologie",
  environnement: "ecologie",
  energie: "ecologie",
  health: "sciences-sante",
  tech: "sciences-sante",
  technology: "sciences-sante",
  technologie: "sciences-sante",
  "intelligence-artificielle": "sciences-sante",
  science: "sciences-sante",
  astronomy: "sciences-sante",
  space: "sciences-sante",
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
