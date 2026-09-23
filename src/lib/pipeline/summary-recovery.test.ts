import assert from "node:assert/strict";
import { test } from "node:test";

import { recoverSummaries } from "./summary-recovery";

test("recoverSummaries leaves clean fields untouched", () => {
  const result = recoverSummaries("A short dek.", "A neutral paraphrase.");
  assert.deepEqual(result, {
    summary: "A short dek.",
    originalSummary: "A neutral paraphrase.",
  });
});

test("recoverSummaries splits an originalSummary leaked into summary", () => {
  const leaked =
    "L'article relate l'adoption de Chat Control 1.0.</summary>\n" +
    '<parameter name="originalSummary">L\'article explique que le Parlement ' +
    "a validé la prolongation du règlement.";

  const result = recoverSummaries(leaked, "");

  assert.equal(result.summary, "L'article relate l'adoption de Chat Control 1.0.");
  assert.equal(
    result.originalSummary,
    "L'article explique que le Parlement a validé la prolongation du règlement.",
  );
});

test("recoverSummaries keeps a real originalSummary over the leaked one", () => {
  const leaked =
    'Dek.</summary><parameter name="originalSummary">leaked copy';

  const result = recoverSummaries(leaked, "The real paraphrase.");

  assert.equal(result.summary, "Dek.");
  assert.equal(result.originalSummary, "The real paraphrase.");
});

test("recoverSummaries strips stray tags without a split marker", () => {
  const result = recoverSummaries("Dek text.</summary>", "Paraphrase.</parameter>");
  assert.deepEqual(result, {
    summary: "Dek text.",
    originalSummary: "Paraphrase.",
  });
});

test("recoverSummaries coerces non-string input to empty strings", () => {
  assert.deepEqual(recoverSummaries(undefined, null), {
    summary: "",
    originalSummary: "",
  });
});
