import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  articleKeywords,
  articleRewrites,
  articleTags,
  articleTokenUsage,
  articles,
  claimSources,
  claims as claimsTable,
  jobs,
  tags as tagsTable,
  type NewJob,
} from "@/db/schema";
import { routing } from "@/i18n/routing";
import { scrapeArticle } from "@/lib/scrape";
import { aggregate } from "./aggregate";
import { assessClaims } from "./assess-claims";
import { addUsage, ZERO_USAGE, type TokenUsage } from "./client";
import {
  saveDiagnostic,
  scrapeDiagnostic,
  type StepDiagnostic,
} from "./diagnostics";
import {
  DEFAULT_REASONING_MODEL,
  HAIKU_MODEL,
  isReasoningModel,
} from "./models";
import { extractClaims } from "./extract-claims";
import { recoverArticleBody } from "./recover-body";
import { rewriteArticle } from "./rewrite";
import { verifyClaims } from "./verify";

// Upper bound on the stored article body to keep rows reasonable.
const MAX_STORED_CONTENT_CHARS = 60_000;

// Below this the scraped body is suspiciously thin; the run still proceeds but
// the diagnostics flag it so an admin can tell a near-empty scrape from a real
// short article.
const SHORT_BODY_WARNING_CHARS = 800;

const TAG_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function colorForTag(slug: string): string {
  let hash = 0;
  for (const ch of slug) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

async function updateJob(id: string, fields: Partial<NewJob>): Promise<void> {
  await db.update(jobs).set(fields).where(eq(jobs.id, id));
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

    let recoverUsage = ZERO_USAGE;
    const { article, provenance } = await scrapeArticle(
      job.url,
      async (blocks, meta) => {
        const { content, usage } = await recoverArticleBody(
          blocks,
          meta,
          HAIKU_MODEL,
        );
        recoverUsage = addUsage(recoverUsage, usage);
        return content;
      },
    );

    steps.push(
      scrapeDiagnostic(
        provenance,
        article.content.length,
        SHORT_BODY_WARNING_CHARS,
      ),
    );

    await updateJob(jobId, { step: "extracting", progress: 25 });
    const {
      claims,
      usage: extractUsage,
      diagnostic: extractDiagnostic,
    } = await extractClaims(article, HAIKU_MODEL);
    steps.push(extractDiagnostic);
    if (extractDiagnostic.truncated) {
      throw new Error(
        "Claim extraction hit max_tokens; raise the extract budget or shorten the article",
      );
    }

    await updateJob(jobId, { step: "verifying", progress: 45 });
    const verification = await verifyClaims(article, claims, reasoningModel);
    steps.push(verification.diagnostic);

    await updateJob(jobId, { step: "aggregating", progress: 60 });
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

    await updateJob(jobId, { step: "assessing-claims", progress: 72 });
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

    await updateJob(jobId, { step: "rewriting", progress: 80 });
    const rewriteResults = await Promise.all(
      routing.locales.map((locale) =>
        rewriteArticle(article, analysis, assessedClaims, locale, reasoningModel),
      ),
    );
    for (const result of rewriteResults) steps.push(result.diagnostic);
    const truncatedRewrite = rewriteResults.find((r) => r.diagnostic.truncated);
    if (truncatedRewrite) {
      throw new Error(
        `Rewrite (${truncatedRewrite.rewrite.locale}) hit max_tokens; the body was truncated`,
      );
    }
    const rewrites = rewriteResults.map((result) => result.rewrite);

    const usageByModel = mergeUsageByModel([
      { model: HAIKU_MODEL, usage: recoverUsage },
      { model: HAIKU_MODEL, usage: extractUsage },
      { model: reasoningModel, usage: verification.usage },
      { model: reasoningModel, usage: aggregateUsage },
      { model: reasoningModel, usage: assessUsage },
      ...rewriteResults.map((result) => ({
        model: reasoningModel,
        usage: result.usage,
      })),
    ]);

    await updateJob(jobId, { step: "saving", progress: 92 });

    let tagsLinked = 0;
    let keywordsStored = 0;
    const articleId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(articles)
        .values({
          slug: `${slugify(analysis.title)}-${crypto.randomUUID().slice(0, 6)}`,
          urlOrigine: article.url,
          sourceName: article.sourceName,
          originalTitle: article.title,
          title: analysis.title,
          summary: analysis.summary,
          originalSummary: analysis.originalSummary,
          content: article.content.slice(0, MAX_STORED_CONTENT_CHARS),
          scrapeDebug: provenance,
          imageUrl: article.imageUrl,
          verdict: analysis.verdict,
          reliabilityScore: analysis.reliabilityScore,
          factualityScore: analysis.scores.factualityScore,
          corroborationScore: analysis.scores.corroborationScore,
          sourcingScore: analysis.scores.sourcingScore,
          completenessScore: analysis.scores.completenessScore,
          transparencyScore: analysis.scores.transparencyScore,
          recencyScore: analysis.scores.recencyScore,
          framing: analysis.framing,
          contentType: analysis.contentType,
          fabricationDetected: analysis.killswitch.fabricationDetected.value,
          domainImpersonation: analysis.killswitch.domainImpersonation.value,
          centralClaimDebunked: analysis.killswitch.centralClaimDebunked.value,
          undisclosedAIWithErrors:
            analysis.killswitch.undisclosedAIWithErrors.value,
          globalConfidence: analysis.globalConfidence,
          criteriaVersion: analysis.criteriaVersion,
          modelVersion: analysis.modelVersion,
          evidence: analysis.evidence,
          locale: analysis.language,
          published: false,
        })
        .returning({ id: articles.id });

      await tx.insert(articleTokenUsage).values(
        [...usageByModel.entries()].map(([model, usage]) => ({
          articleId: created.id,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheCreationTokens: usage.cacheCreationTokens,
          cacheReadTokens: usage.cacheReadTokens,
          webSearchRequests:
            model === reasoningModel ? verification.searchRequests : 0,
          searchProvider: verification.searchProvider,
        })),
      );

      if (rewrites.length > 0) {
        await tx.insert(articleRewrites).values(
          rewrites.map((r) => ({
            articleId: created.id,
            locale: r.locale,
            title: r.title,
            body: r.body,
          })),
        );
      }

      if (analysis.keywords.length > 0) {
        const keywordRows = [...new Set(analysis.keywords.map(slugify))]
          .filter(Boolean)
          .map((keyword) => ({ articleId: created.id, keyword }));
        keywordsStored = keywordRows.length;
        if (keywordRows.length > 0) {
          await tx
            .insert(articleKeywords)
            .values(keywordRows)
            .onConflictDoNothing();
        }
      }

      for (const [index, claim] of assessedClaims.entries()) {
        const [createdClaim] = await tx
          .insert(claimsTable)
          .values({
            articleId: created.id,
            position: index,
            claimText: claim.text,
            status: claim.status,
            explanation: claim.explanation,
            sourceQuote: claim.sourceQuote || null,
          })
          .returning({ id: claimsTable.id });

        if (claim.sources.length > 0) {
          await tx.insert(claimSources).values(
            claim.sources.map((source) => ({
              claimId: createdClaim.id,
              url: source.url,
              title: source.title,
            })),
          );
        }
      }

      if (analysis.tags.length > 0) {
        const tagRows = analysis.tags.map((label) => {
          const slug = slugify(label);
          return { label, slug, color: colorForTag(slug) };
        });
        await tx
          .insert(tagsTable)
          .values(tagRows)
          .onConflictDoNothing({ target: tagsTable.slug });

        const stored = await tx
          .select({ id: tagsTable.id })
          .from(tagsTable)
          .where(
            inArray(
              tagsTable.slug,
              tagRows.map((t) => t.slug),
            ),
          );
        tagsLinked = stored.length;
        if (stored.length > 0) {
          await tx
            .insert(articleTags)
            .values(stored.map((t) => ({ articleId: created.id, tagId: t.id })))
            .onConflictDoNothing();
        }
      }

      return created.id;
    });

    steps.push(
      saveDiagnostic({
        claimsSaved: assessedClaims.length,
        claimSourcesSaved: assessedClaims.reduce(
          (total, claim) => total + claim.sources.length,
          0,
        ),
        tagsRequested: analysis.tags.length,
        tagsLinked,
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
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date(),
      diagnostics: { steps },
    });
  }
}
