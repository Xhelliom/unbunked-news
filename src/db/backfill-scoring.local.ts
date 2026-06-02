import { eq, isNull } from "drizzle-orm";

import { db } from "./client";
import { articles } from "./schema";
import {
  clampToBand,
  computeGlobal,
  CRITERIA_VERSION,
  levelForScore,
  scoreBand,
  type CriterionAssessment,
  type CriterionAssessments,
  type Framing,
  type Killswitch,
} from "@/lib/score-criteria";
import type { AnalysisEvidence } from "@/lib/pipeline/schemas";

// Deterministic, no-AI backfill of existing local articles to the v1.2 shape.
// It does NOT re-judge anything: it reuses the stored v1.0 sub-scores, recomputes
// the global as the renormalised weighted average of the criteria we actually
// have, and derives the verdict from it.
//
//   pnpm db:backfill-scoring-local
//
// Honest gaps (never invented): `corroboration` did not exist in v1.0, so it
// stays null and is excluded from the average; confidence is forced to "low";
// contentType stays null. Claims are left untouched. For a true v1.2 judgement
// (corroboration via web search, killswitch, framing/contentType), re-run the
// pipeline instead (db:rescore-local) with a real ANTHROPIC_API_KEY.

const BACKFILL_MODEL = "backfill-v1.0→v1.2";

function assess(score: number | null): CriterionAssessment | null {
  if (score === null) return null;
  const level = levelForScore(score);
  return {
    level,
    score: clampToBand(level, score),
    confidence: "low",
    rationale: "Rétro-calculé depuis la notation v1.0 (pas de jugement IA v1.2).",
    sources: [],
  };
}

// Maps the old neutrality sub-score onto the new (unscored) framing descriptor:
// the more neutral the old score, the more neutral the framing. Null neutrality
// → null framing (not invented).
function framingFromNeutrality(neutrality: number | null): Framing | null {
  if (neutrality === null) return null;
  if (neutrality >= 85) return "neutre";
  if (neutrality >= 60) return "orienté-modéré";
  if (neutrality >= 40) return "orienté-marqué";
  return "militant";
}

function emptySignal() {
  return { value: false, rationale: "", sources: [] as string[] };
}
const cleanKillswitch: Killswitch = {
  fabricationDetected: emptySignal(),
  domainImpersonation: emptySignal(),
  centralClaimDebunked: emptySignal(),
  undisclosedAIWithErrors: emptySignal(),
};

async function backfill(): Promise<void> {
  // Only touch rows never scored under v1.2 (criteriaVersion still null). This
  // keeps the script idempotent and, critically, never clobbers an article that
  // already carries a real v1.2 judgement (pipeline) or an earlier backfill.
  const rows = await db.query.articles.findMany({
    where: isNull(articles.criteriaVersion),
  });
  if (rows.length === 0) {
    console.log("No pre-v1.2 articles to backfill — nothing to do.");
    return;
  }
  console.log(`Backfilling ${rows.length} pre-v1.2 article(s)…`);

  for (const article of rows) {
    const criteria: CriterionAssessments = {
      factuality: assess(article.factualityScore),
      corroboration: null, // no v1.0 data — never invented
      sourcing: assess(article.sourcingScore),
      completeness: assess(article.completenessScore),
      transparency: assess(article.transparencyScore),
      recency: assess(article.recencyScore),
    };

    const global = computeGlobal(criteria);
    const verdict = global === null ? "unverifiable" : scoreBand(global);
    const evidence: AnalysisEvidence = {
      criteria,
      killswitch: cleanKillswitch,
    };

    await db
      .update(articles)
      .set({
        verdict,
        reliabilityScore: global,
        corroborationScore: null,
        framing: framingFromNeutrality(article.neutralityScore),
        contentType: null,
        fabricationDetected: false,
        domainImpersonation: false,
        centralClaimDebunked: false,
        undisclosedAIWithErrors: false,
        globalConfidence: "low",
        criteriaVersion: CRITERIA_VERSION,
        modelVersion: BACKFILL_MODEL,
        evidence,
      })
      .where(eq(articles.id, article.id));

    console.log(
      `• ${article.title}\n  → ${verdict} · ${global ?? "—"}/100 (confidence low, corroboration n/a)`,
    );
  }

  console.log("\nDone.");
}

backfill()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
