import { test } from "node:test";
import assert from "node:assert/strict";

import { FALLBACK_RUBRIC, isRubric, RUBRICS } from "./rubrics";

test("isRubric accepts every canonical slug", () => {
  for (const slug of RUBRICS) {
    assert.equal(isRubric(slug), true);
  }
});

test("isRubric rejects unknown or non-string values", () => {
  assert.equal(isRubric("tech"), false);
  assert.equal(isRubric(""), false);
  assert.equal(isRubric("Politique"), false);
  assert.equal(isRubric(undefined), false);
  assert.equal(isRubric(null), false);
  assert.equal(isRubric(42), false);
});

test("the fallback rubric is itself a valid rubric", () => {
  assert.equal(isRubric(FALLBACK_RUBRIC), true);
});

test("the taxonomy is the agreed eight, unique", () => {
  assert.equal(RUBRICS.length, 8);
  assert.equal(new Set(RUBRICS).size, 8);
});
