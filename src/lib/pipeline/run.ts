import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { jobs, type NewJob } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { scrapeArticle } from "@/lib/scrape";
import { aggregate } from "./aggregate";
import { assessClaims } from "./assess-claims";
import { saveAnalysis } from "./save-article";
import {
  addUsage,
  MAX_CONTENT_CHARS,
  ZERO_USAGE,
  type TokenUsage,
} from "./client";
import {
  rewriteFailureDiagnostic,
  saveDiagnostic,
  scrapeDiagnostic,
  type StepDiagnostic,
} from "./diagnostics";
import type { JobLive, PauseInfo } from "./job-live";
import {
  DEFAULT_MAX_CLAIMS,
  DEFAULT_MAX_SEARCH_ROUNDS,
  suggestedMaxClaims,
  suggestedMaxSearchRounds,
} from "./limits";
import {
  DEFAULT_REASONING_MODEL,
  HAIKU_MODEL,
  isReasoningModel,
} from "./models";
import { extractClaims } from "./extract-claims";
import { rewriteArticle } from "./rewrite";
import { structureArticleBody } from "./structure-body";
import { verifyClaims } from "./verify";

// Below this the scraped body is suspiciously thin; the run still proceeds but
// the diagnostics flag it so an admin can tell a near-empty scrape from a real
// short article.
const SHORT_BODY_WARNING_CHARS = 800;

async function updateJob(id: string, fields: Partial<NewJob>): Promise<void> {
  await db.update(jobs).set(fields).where(eq(jobs.id, id));
}

function buildPauseInfo(contentChars: number): PauseInfo {
  return {
    reason: "long-article",
    contentChars,
    truncateAt: MAX_CONTENT_CHARS,
    defaultMaxClaims: DEFAULT_MAX_CLAIMS,
    defaultMaxSearchRounds: DEFAULT_MAX_SEARCH_ROUNDS,
    suggestedMaxClaims: suggestedMaxClaims(contentChars),
    suggestedMaxSearchRounds: suggestedMaxSearchRounds(contentChars),
  };
}

// A tiered run spends tokens on more than one model. Token usage is billed per
// model, so usage is folded into one entry per model before it is persisted —
// collapsing to a single row when every phase happened to use the same model.
type ModelUsage = { model: string; usage: TokenUsage };

function mergeUsageByModel(parts: ModelUsage[]): Map<string, TokenUsage> {
  const merged = new Map<string, TokenUsage>();
  for (const { model, usage } of parts) {
    merged.set(model, addUsage(merged.get(model) ?? ZERO_USAGE, usage));
  }
  return merged;
}

export async function runPipeline(jobId: string): Promise<void> {
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) return;

  // Per-step audit trail, persisted on the job on BOTH the success and the
  // failure path so a degraded or aborted run can be explained after the fact.
  const steps: StepDiagnostic[] = [];
  // Rolling snapshot of in-flight numbers, persisted alongside the diagnostics
  // at every phase boundary so the admin progress UI shows live data.
  const live: JobLive = {};

  try {
    await updateJob(jobId, {
      status: "running",
      step: "scraping",
      progress: 5,
      startedAt: new Date(),
      error: null,
    });

    // Mechanical phases (body recovery, claim extraction) run on Haiku; the
    // reasoning phases (verification, scoring, rewrite) run on reasoningModel,
    // which the submitter may override (else the default Sonnet tier). Web
    // search happens only during verification, so its requests bill against the
    // reasoning model's row.
    const reasoningModel = isReasoningModel(job.model)
      ? job.model
      : DEFAULT_REASONING_MODEL;

    let structureUsage = ZERO_USAGE;
    // The AI structuring step drives extraction (refine the body, or re-extract
    // the whole page when it looks wrong). If it fails (truncation, API error),
    // we degrade to the deterministic body rather than sink the job.
    const structureWarnings: string[] = [];
    const { article, provenance } = await scrapeArticle(
      job.url,
      async (blocks, meta) => {
        try {
          const { blocks: structured, complete, usage } =
            await structureArticleBody(blocks, meta, HAIKU_MODEL);
          structureUsage = addUsage(structureUsage, usage);
          return { blocks: structured, complete };
        } catch (error) {
          structureWarnings.push(
            error instanceof Error ? error.message : String(error),
          );
          // Degrade to the deterministic body; don't escalate on a transient
          // failure, the quality gate still governs whole-page recovery.
          return { blocks: [], complete: true };
        }
      },
    );

    steps.push(
      scrapeDiagnostic(
        provenance,
        article.content.length,
        SHORT_BODY_WARNING_CHARS,
        structureWarnings,
      ),
    );

    const contentChars = article.content.length;
    live.contentChars = contentChars;

    // Préflight: a body past the model window gets truncated before every
    // reasoning phase, so a long investigation would be scored on a fraction of
    // its content. Rather than do that silently, pause once and let the admin
    // raise the claim/search budget (or accept the suggestions). pauseAck is set
    // on resume, so the gate is crossed exactly once — a resumed run re-scrapes
    // then proceeds straight through.
    if (contentChars > MAX_CONTENT_CHARS && !job.pauseAck) {
      await updateJob(jobId, {
        status: "paused",
        step: "scraping",
        progress: 5,
        pauseInfo: buildPauseInfo(contentChars),
        diagnostics: { steps },
        live,
      });
      return;
    }

    const maxClaims = job.maxClaims ?? suggestedMaxClaims(contentChars);
    const maxSearchRounds =
      job.maxSearchRounds ?? suggestedMaxSearchRounds(contentChars);

    await updateJob(jobId, {
      step: "extracting",
      progress: 25,
      diagnostics: { steps },
      live,
    });
    const {
      claims,
      usage: extractUsage,
      diagnostic: extractDiagnostic,
    } = await extractClaims(article, HAIKU_MODEL, maxClaims);
    steps.push(extractDiagnostic);
    if (extractDiagnostic.truncated) {
      throw new Error(
        "Claim extraction hit max_tokens; raise the extract budget or shorten the article",
      );
    }
    live.claimsExtracted = claims.length;

    await updateJob(jobId, {
      step: "verifying",
      progress: 45,
      diagnostics: { steps },
      live,
    });
    live.verifyRoundsMax = maxSearchRounds;
    const verification = await verifyClaims(article, claims, reasoningModel, {
      maxSearchRounds,
      onRound: async (round, sources) => {
        live.verifyRound = round;
        live.sourcesFound = sources;
        await updateJob(jobId, { live });
      },
    });
    steps.push(verification.diagnostic);
    live.sourcesFound = verification.sources.length;

    await updateJob(jobId, {
      step: "aggregating",
      progress: 60,
      diagnostics: { steps },
      live,
    });
    const {
      analysis,
      usage: aggregateUsage,
      diagnostic: aggregateDiagnostic,
    } = await aggregate(article, claims, verification, reasoningModel);
    steps.push(aggregateDiagnostic);
    if (aggregateDiagnostic.truncated) {
      throw new Error(
        "Aggregation hit max_tokens; the criteria tail was truncated. Raise the aggregate budget",
      );
    }
    live.verdict = analysis.verdict;
    live.reliabilityScore = analysis.reliabilityScore;

    await updateJob(jobId, {
      step: "assessing-claims",
      progress: 72,
      diagnostics: { steps },
      live,
    });
    const {
      claims: assessedClaims,
      usage: assessUsage,
      diagnostic: assessDiagnostic,
    } = await assessClaims(article, claims, verification, reasoningModel);
    steps.push(assessDiagnostic);
    if (assessDiagnostic.truncated) {
      throw new Error(
        "Claim assessment hit max_tokens; the claims tail was truncated. Raise the assess-claims budget",
      );
    }
    live.claimsAssessed = assessedClaims.length;

    await updateJob(jobId, {
      step: "rewriting",
      progress: 80,
      diagnostics: { steps },
      live,
    });
    // One locale failing or getting truncated must not sink the whole run: the
    // article is still scored and the other locale(s) still publish. Every
    // outcome (success, truncation or hard failure) is recorded in the
    // diagnostics; only a total wipeout throws.
    const rewriteOutcomes = await Promise.allSettled(
      routing.locales.map((locale) =>
        rewriteArticle(article, analysis, assessedClaims, locale, reasoningModel),
      ),
    );
    const rewriteResults = rewriteOutcomes.flatMap((outcome, index) => {
      if (outcome.status === "rejected") {
        steps.push(rewriteFailureDiagnostic(routing.locales[index], outcome.reason));
        return [];
      }
      steps.push(outcome.value.diagnostic);
      return [outcome.value];
    });
    // Token cost is billed for every attempt that reached the model, including a
    // truncated one; a truncated body is just not persisted.
    const rewriteUsages = rewriteResults.map((result) => result.usage);
    const rewrites = rewriteResults
      .filter((result) => !result.diagnostic.truncated)
      .map((result) => result.rewrite);
    if (rewrites.length === 0) {
      throw new Error(
        "Every locale rewrite failed or was truncated; no usable rewrite produced",
      );
    }

    const usageByModel = mergeUsageByModel([
      { model: HAIKU_MODEL, usage: structureUsage },
      { model: HAIKU_MODEL, usage: extractUsage },
      { model: reasoningModel, usage: verification.usage },
      { model: reasoningModel, usage: aggregateUsage },
      { model: reasoningModel, usage: assessUsage },
      ...rewriteUsages.map((usage) => ({ model: reasoningModel, usage })),
    ]);

    live.rewriteLocalesDone = rewrites.length;
    await updateJob(jobId, {
      step: "saving",
      progress: 92,
      diagnostics: { steps },
      live,
    });

    const { articleId, keywordsStored } = await saveAnalysis({
      targetArticleId: job.targetArticleId,
      scraped: article,
      provenance,
      analysis,
      assessedClaims,
      rewrites,
      usageByModel,
      reasoningModel,
      searchRequests: verification.searchRequests,
      searchProvider: verification.searchProvider,
    });

    steps.push(
      saveDiagnostic({
        claimsSaved: assessedClaims.length,
        claimSourcesSaved: assessedClaims.reduce(
          (total, claim) => total + claim.sources.length,
          0,
        ),
        keywordsRequested: analysis.keywords.length,
        keywordsStored,
      }),
    );

    await updateJob(jobId, {
      status: "succeeded",
      step: "done",
      progress: 100,
      articleId,
      finishedAt: new Date(),
      diagnostics: { steps },
      live,
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date(),
      diagnostics: { steps },
      live,
    });
  }
}
