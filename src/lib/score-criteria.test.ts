import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clampToBand,
  computeGlobal,
  deriveScoring,
  KILLSWITCH_CAP,
  levelForScore,
  type CriterionAssessment,
  type CriterionAssessments,
} from "./score-criteria";

function at(
  level: 0 | 1 | 2 | 3,
  score: number,
  confidence: CriterionAssessment["confidence"] = "high",
): CriterionAssessment {
  return { level, score, confidence, rationale: "r", sources: ["https://x"] };
}

// A full, healthy set of the five core criteria + recency, all at the same
// score so the weighted average is trivially that score.
function uniform(score: number, level: 0 | 1 | 2 | 3): CriterionAssessments {
  return {
    factuality: at(level, score),
    corroboration: at(level, score),
    sourcing: at(level, score),
    completeness: at(level, score),
    transparency: at(level, score),
    recency: at(level, score),
  };
}

test("clampToBand keeps the refined score inside its level band", () => {
  assert.equal(clampToBand(2, 95), 84); // L2 caps at 84
  assert.equal(clampToBand(2, 10), 60); // L2 floors at 60
  assert.equal(clampToBand(3, 90), 90); // already in band
  assert.equal(clampToBand(0, 50), 39); // L0 caps at 39
});

test("levelForScore round-trips the bands", () => {
  assert.equal(levelForScore(0), 0);
  assert.equal(levelForScore(39), 0);
  assert.equal(levelForScore(40), 1);
  assert.equal(levelForScore(59), 1);
  assert.equal(levelForScore(60), 2);
  assert.equal(levelForScore(84), 2);
  assert.equal(levelForScore(85), 3);
  assert.equal(levelForScore(100), 3);
});

test("computeGlobal is the weighted average, scores clamped to band", () => {
  // All criteria at 90/L3 → global 90.
  assert.equal(computeGlobal(uniform(90, 3)), 90);
  // A refined 95 at L2 is clamped to 84 before averaging.
  const clamped = computeGlobal({
    factuality: at(2, 95),
    corroboration: at(2, 95),
    sourcing: at(2, 95),
    completeness: at(2, 95),
    transparency: at(2, 95),
    recency: at(2, 95),
  });
  assert.equal(clamped, 84);
});

test("computeGlobal renormalises the weights when recency is null", () => {
  // factuality(30)=80, everything else(70)=60 → with recency present the 5
  // weight would pull it; without recency the denominator is 95, not 100.
  const criteria: CriterionAssessments = {
    factuality: at(2, 80),
    corroboration: at(2, 60),
    sourcing: at(2, 60),
    completeness: at(2, 60),
    transparency: at(2, 60),
    recency: null,
  };
  // (80*30 + 60*(25+18+12+10)) / 95 = (2400 + 3900) / 95 = 6300/95 = 66.3 → 66
  assert.equal(computeGlobal(criteria), 66);
});

test("deriveScoring maps the global to the right verdict band", () => {
  assert.equal(deriveScoring(uniform(90, 3), false).verdict, "reliable");
  assert.equal(deriveScoring(uniform(70, 2), false).verdict, "nuanced");
  assert.equal(deriveScoring(uniform(50, 1), false).verdict, "fragile");
  assert.equal(deriveScoring(uniform(20, 0), false).verdict, "debunked");
});

test("a raised killswitch caps the global and forces debunked", () => {
  const result = deriveScoring(uniform(95, 3), true);
  assert.equal(result.verdict, "debunked");
  assert.ok(result.reliabilityScore !== null);
  assert.ok((result.reliabilityScore ?? 100) <= KILLSWITCH_CAP);
});

test("≥2 missing core criteria ⇒ unverifiable with null global", () => {
  const criteria: CriterionAssessments = {
    factuality: at(3, 90),
    corroboration: at(3, 90),
    sourcing: at(3, 90),
    // completeness and transparency missing
    recency: at(3, 90),
  };
  const result = deriveScoring(criteria, false);
  assert.equal(result.verdict, "unverifiable");
  assert.equal(result.reliabilityScore, null);
});

test("low confidence on weak corroboration ⇒ unverifiable", () => {
  const criteria: CriterionAssessments = {
    factuality: at(2, 70, "low"),
    corroboration: at(1, 50), // weak (level ≤ 1)
    sourcing: at(2, 70),
    completeness: at(2, 70),
    transparency: at(2, 70),
    recency: at(2, 70),
  };
  const result = deriveScoring(criteria, false);
  assert.equal(result.globalConfidence, "low");
  assert.equal(result.verdict, "unverifiable");
  assert.equal(result.reliabilityScore, null);
});

test("a single missing core criterion is excluded, not backfilled", () => {
  // transparency missing; the remaining five (incl. recency) still produce a
  // number — and it must NOT equal what a 0 or a copied-global would give.
  const criteria: CriterionAssessments = {
    factuality: at(3, 90),
    corroboration: at(3, 90),
    sourcing: at(3, 90),
    completeness: at(3, 90),
    recency: at(3, 90),
  };
  const result = deriveScoring(criteria, false);
  assert.equal(result.reliabilityScore, 90); // pure average of the present ones
  assert.equal(result.verdict, "reliable");
  // one missing core ⇒ confidence drops to low
  assert.equal(result.globalConfidence, "low");
});

test("deriveScoring is pure: same input ⇒ same output", () => {
  const criteria = uniform(72, 2);
  const a = deriveScoring(criteria, false);
  const b = deriveScoring(criteria, false);
  assert.deepEqual(a, b);
});
