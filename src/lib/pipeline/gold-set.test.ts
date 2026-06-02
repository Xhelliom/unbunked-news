import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  computeGoldMetrics,
  modeVerdict,
  parseGoldArticles,
  selfConsistency,
  stdDev,
  type ArticleRuns,
} from "./gold-set";

test("modeVerdict picks the most frequent verdict", () => {
  assert.equal(
    modeVerdict(["reliable", "nuanced", "nuanced", "fragile"]),
    "nuanced",
  );
});

test("selfConsistency is the fraction matching the mode", () => {
  assert.equal(selfConsistency(["reliable", "reliable", "reliable"]), 1);
  assert.equal(
    selfConsistency(["reliable", "reliable", "reliable", "nuanced"]),
    0.75,
  );
});

test("stdDev is 0 for identical scores", () => {
  assert.equal(stdDev([72, 72, 72]), 0);
  assert.ok(stdDev([60, 70, 80]) > 0);
});

test("computeGoldMetrics passes a stable, accurate set", () => {
  const results: ArticleRuns[] = [
    {
      expectedVerdict: "reliable",
      runs: [
        { verdict: "reliable", reliabilityScore: 90 },
        { verdict: "reliable", reliabilityScore: 91 },
        { verdict: "reliable", reliabilityScore: 89 },
      ],
    },
  ];
  const metrics = computeGoldMetrics(results);
  assert.equal(metrics.sameBandRate, 1);
  assert.equal(metrics.accuracy, 1);
  assert.ok(metrics.globalStdDev <= 6);
  assert.equal(metrics.pass, true);
});

test("computeGoldMetrics fails an unstable set", () => {
  const results: ArticleRuns[] = [
    {
      expectedVerdict: "nuanced",
      runs: [
        { verdict: "reliable", reliabilityScore: 88 },
        { verdict: "fragile", reliabilityScore: 55 },
        { verdict: "debunked", reliabilityScore: 30 },
      ],
    },
  ];
  const metrics = computeGoldMetrics(results);
  assert.equal(metrics.pass, false);
});

test("empty gold set passes vacuously (gate not armed)", () => {
  const metrics = computeGoldMetrics([]);
  assert.equal(metrics.articles, 0);
  assert.equal(metrics.pass, true);
});

test("shipped fixtures file parses (currently empty)", () => {
  const raw = JSON.parse(
    readFileSync(new URL("./gold-set.fixtures.json", import.meta.url), "utf8"),
  );
  const articles = parseGoldArticles(raw);
  assert.ok(Array.isArray(articles));
});
