import { test } from "node:test";
import assert from "node:assert/strict";

import { rubricForTagSlugs, TAG_RUBRIC_MAP } from "./tag-rubric-map";
import { FALLBACK_RUBRIC, isRubric } from "./rubrics";

test("every mapped tag points at a real rubric", () => {
  for (const rubric of Object.values(TAG_RUBRIC_MAP)) {
    assert.equal(isRubric(rubric), true);
  }
});

test("maps the seeded tag slugs to their rubric", () => {
  assert.equal(rubricForTagSlugs(["politics"]), "politique");
  assert.equal(rubricForTagSlugs(["economy"]), "economie-social");
  assert.equal(rubricForTagSlugs(["environment"]), "ecologie");
  assert.equal(rubricForTagSlugs(["health"]), "sciences-sante");
  assert.equal(rubricForTagSlugs(["tech"]), "sciences-sante");
});

test("the first mappable slug wins", () => {
  assert.equal(rubricForTagSlugs(["unknown", "politics"]), "politique");
  assert.equal(rubricForTagSlugs(["environment", "health"]), "ecologie");
});

test("falls back to societe with no mappable tag", () => {
  assert.equal(rubricForTagSlugs([]), FALLBACK_RUBRIC);
  assert.equal(rubricForTagSlugs(["sport", "media"]), FALLBACK_RUBRIC);
});
