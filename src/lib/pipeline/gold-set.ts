import { VERDICTS, type Verdict } from "@/lib/verdicts";

// Gold-set non-regression gate (docs/SCORING.md §13). The aggregation is
// deterministic, but the AI's per-criterion judgement is not, so we measure
// stability: replay each labelled article N times and check that the runs land
// in the same verdict band and that the global score barely moves.
//
// The harness is split so the maths is unit-testable without any AI call: the
// metric functions below are pure; runGoldSet only orchestrates a caller-
// provided scorer. The dataset (gold-set.fixtures.json) ships empty — populate
// it to arm the gate.

export const GOLD_RUNS = 5;
export const SAME_BAND_TARGET = 0.9; // ≥90% of runs in the same verdict band
export const STDDEV_TARGET = 6; // ≤6 points of global std-dev

export type GoldArticle = { url: string; expectedVerdict: Verdict };
export type RunOutcome = { verdict: Verdict; reliabilityScore: number | null };
export type ArticleRuns = { expectedVerdict: Verdict; runs: RunOutcome[] };

export type GoldMetrics = {
  articles: number;
  sameBandRate: number; // mean self-consistency (runs matching the modal band)
  accuracy: number; // mean fraction of runs matching the expected verdict
  globalStdDev: number; // mean per-article std-dev of numeric globals
  pass: boolean;
};

function isGoldArticle(value: unknown): value is GoldArticle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.url === "string" &&
    (VERDICTS as readonly string[]).includes(v.expectedVerdict as string)
  );
}

export function parseGoldArticles(value: unknown): GoldArticle[] {
  return Array.isArray(value) ? value.filter(isGoldArticle) : [];
}

// The most frequent verdict in a set of runs (ties broken by VERDICTS order).
export function modeVerdict(verdicts: Verdict[]): Verdict {
  const counts = new Map<Verdict, number>();
  for (const verdict of verdicts) {
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
  }
  let best: Verdict = verdicts[0];
  let bestCount = -1;
  for (const verdict of VERDICTS) {
    const count = counts.get(verdict) ?? 0;
    if (count > bestCount) {
      best = verdict;
      bestCount = count;
    }
  }
  return best;
}

// Fraction of runs that land in the modal verdict (self-consistency).
export function selfConsistency(verdicts: Verdict[]): number {
  if (verdicts.length === 0) return 1;
  const mode = modeVerdict(verdicts);
  return verdicts.filter((v) => v === mode).length / verdicts.length;
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Aggregates the per-article runs into the gate metrics. Empty input passes
// vacuously (the gate does not block when no dataset is configured).
export function computeGoldMetrics(results: ArticleRuns[]): GoldMetrics {
  if (results.length === 0) {
    return {
      articles: 0,
      sameBandRate: 1,
      accuracy: 1,
      globalStdDev: 0,
      pass: true,
    };
  }

  let sameBandSum = 0;
  let accuracySum = 0;
  let stdDevSum = 0;
  for (const { expectedVerdict, runs } of results) {
    const verdicts = runs.map((r) => r.verdict);
    sameBandSum += selfConsistency(verdicts);
    accuracySum +=
      verdicts.filter((v) => v === expectedVerdict).length /
      (verdicts.length || 1);
    const scores = runs
      .map((r) => r.reliabilityScore)
      .filter((s): s is number => s !== null);
    stdDevSum += stdDev(scores);
  }

  const articles = results.length;
  const sameBandRate = sameBandSum / articles;
  const globalStdDev = stdDevSum / articles;
  return {
    articles,
    sameBandRate,
    accuracy: accuracySum / articles,
    globalStdDev,
    pass: sameBandRate >= SAME_BAND_TARGET && globalStdDev <= STDDEV_TARGET,
  };
}

// Replays each article through a caller-provided scorer N times. The scorer is
// the live pipeline (or a recorded one); kept out of this module so the metrics
// stay pure and CI-friendly.
export async function runGoldSet(
  articles: GoldArticle[],
  scorer: (url: string) => Promise<RunOutcome>,
  runs = GOLD_RUNS,
): Promise<GoldMetrics> {
  const results: ArticleRuns[] = [];
  for (const article of articles) {
    const outcomes: RunOutcome[] = [];
    for (let i = 0; i < runs; i += 1) {
      outcomes.push(await scorer(article.url));
    }
    results.push({ expectedVerdict: article.expectedVerdict, runs: outcomes });
  }
  return computeGoldMetrics(results);
}
