import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  articleSnapshots,
  articleTokenUsage,
  articles,
} from "@/db/schema";
import {
  replaceArticleAnalysisChildren,
  type ArticleAnalysisChildren,
} from "@/lib/article-children";
import { buildArticleSnapshot } from "@/lib/article-snapshot";
import type { ScrapeProvenance, ScrapedArticle } from "@/lib/scrape";
import type { TokenUsage } from "./client";
import type {
  Analysis,
  AnalysisClaim,
  Rewrite,
  SearchProvider,
} from "./schemas";

// Upper bound on the stored article body to keep rows reasonable.
const MAX_STORED_CONTENT_CHARS = 60_000;

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type SaveAnalysisParams = {
  // When set, the existing article is snapshotted then overwritten in place
  // (URL, slug, publication state and creation date are preserved). Null creates
  // a fresh, unpublished article.
  targetArticleId: string | null;
  scraped: ScrapedArticle;
  provenance: ScrapeProvenance;
  analysis: Analysis;
  assessedClaims: AnalysisClaim[];
  rewrites: Rewrite[];
  usageByModel: Map<string, TokenUsage>;
  reasoningModel: string;
  searchRequests: number;
  searchProvider: SearchProvider;
};

export type SaveAnalysisResult = {
  articleId: string;
  keywordsStored: number;
};

// Persists a completed analysis: either a fresh article or an in-place overwrite
// of an existing one. The analysis children are written identically in both
// cases; only the parent row differs (insert vs. snapshot-then-update).
export async function saveAnalysis(
  params: SaveAnalysisParams,
): Promise<SaveAnalysisResult> {
  const {
    targetArticleId,
    scraped,
    provenance,
    analysis,
    assessedClaims,
    rewrites,
    usageByModel,
    reasoningModel,
    searchRequests,
    searchProvider,
  } = params;

  // Fields shared by insert and update. Excludes slug and every editorial flag
  // (published, publishedAt, deletedAt, showOriginal, contributionsEnabled) so
  // an in-place re-analysis keeps the article's identity and publication state.
  const articleValues = {
    urlOrigine: scraped.url,
    sourceName: scraped.sourceName,
    originalTitle: scraped.title,
    title: analysis.title,
    summary: analysis.summary,
    originalSummary: analysis.originalSummary,
    content: scraped.content.slice(0, MAX_STORED_CONTENT_CHARS),
    scrapeDebug: provenance,
    imageUrl: scraped.imageUrl,
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
    undisclosedAIWithErrors: analysis.killswitch.undisclosedAIWithErrors.value,
    globalConfidence: analysis.globalConfidence,
    criteriaVersion: analysis.criteriaVersion,
    modelVersion: analysis.modelVersion,
    evidence: analysis.evidence,
    rubric: analysis.rubric,
    locale: analysis.language,
  };

  const keywords = [...new Set(analysis.keywords.map(slugify))].filter(Boolean);
  const children: ArticleAnalysisChildren = {
    keywords,
    rewrites: rewrites.map((rewrite) => ({
      locale: rewrite.locale,
      title: rewrite.title,
      body: rewrite.body,
    })),
    claims: assessedClaims.map((claim, index) => ({
      position: index,
      claimText: claim.text,
      status: claim.status,
      explanation: claim.explanation,
      sourceQuote: claim.sourceQuote || null,
      sources: claim.sources.map((source) => ({
        url: source.url,
        title: source.title,
        publisher: null,
      })),
    })),
  };

  return db.transaction(async (tx) => {
    const existing = targetArticleId
      ? await tx.query.articles.findFirst({
          where: eq(articles.id, targetArticleId),
          with: {
            claims: { with: { sources: true } },
            rewrites: true,
            keywords: true,
          },
        })
      : null;

    let articleId: string;

    if (existing) {
      await tx.insert(articleSnapshots).values({
        articleId: existing.id,
        data: buildArticleSnapshot(existing),
      });

      await tx
        .update(articles)
        .set(articleValues)
        .where(eq(articles.id, existing.id));

      // Token usage is owned by the saving step, so it is cleared here; the rest
      // of the children are replaced by replaceArticleAnalysisChildren.
      await tx
        .delete(articleTokenUsage)
        .where(eq(articleTokenUsage.articleId, existing.id));

      articleId = existing.id;
    } else {
      const [created] = await tx
        .insert(articles)
        .values({
          ...articleValues,
          slug: `${slugify(analysis.title)}-${crypto.randomUUID().slice(0, 6)}`,
          published: false,
        })
        .returning({ id: articles.id });
      articleId = created.id;
    }

    await tx.insert(articleTokenUsage).values(
      [...usageByModel.entries()].map(([model, usage]) => ({
        articleId,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationTokens: usage.cacheCreationTokens,
        cacheReadTokens: usage.cacheReadTokens,
        webSearchRequests: model === reasoningModel ? searchRequests : 0,
        searchProvider,
      })),
    );

    await replaceArticleAnalysisChildren(tx, articleId, children);

    return { articleId, keywordsStored: keywords.length };
  });
}
