import { eq } from "drizzle-orm";

import { db } from "./client";
import { articles, claimSources, claims as claimsTable } from "./schema";
import { scrapeArticle, type ScrapedArticle } from "@/lib/scrape";
import { aggregate } from "@/lib/pipeline/aggregate";
import { extractClaims } from "@/lib/pipeline/extract-claims";
import { HAIKU_MODEL, SONNET_MODEL } from "@/lib/pipeline/models";
import { recoverArticleBody } from "@/lib/pipeline/recover-body";
import { verifyClaims } from "@/lib/pipeline/verify";

// Re-scores existing local articles with the v1.2 pipeline IN PLACE (no new
// rows). Reuses the stored article body when present so it doesn't re-scrape;
// falls back to scraping when the body is missing. Existing rewrites are left
// untouched. The react-server condition makes `server-only` a no-op; --env-file
// loads .env.local before any module reads process.env:
//
//   pnpm db:rescore-local
//   # = node --conditions=react-server --env-file=.env.local --import tsx \
//   #     src/db/rescore-articles.local.ts
//
// Requires a real ANTHROPIC_API_KEY in .env.local (extract + web-search verify +
// aggregate each cost API calls).

async function scrapedFor(article: {
  urlOrigine: string;
  originalTitle: string | null;
  title: string;
  sourceName: string;
  content: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
}): Promise<ScrapedArticle> {
  if (article.content && article.content.trim().length > 0) {
    return {
      url: article.urlOrigine,
      title: article.originalTitle ?? article.title,
      sourceName: article.sourceName,
      content: article.content,
      imageUrl: article.imageUrl,
      author: null,
      publishedAt: article.publishedAt,
    };
  }
  const { article: scraped } = await scrapeArticle(
    article.urlOrigine,
    async (blocks, meta) =>
      (await recoverArticleBody(blocks, meta, HAIKU_MODEL)).content,
  );
  return scraped;
}

async function rescore(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is empty — set a real key in .env.local");
  }

  const rows = await db.query.articles.findMany();
  console.log(`Re-scoring ${rows.length} article(s) with v1.2…`);

  for (const article of rows) {
    console.log(`\n• ${article.title}\n  ${article.urlOrigine}`);
    try {
      const scraped = await scrapedFor(article);
      const { claims } = await extractClaims(scraped, HAIKU_MODEL);
      const verification = await verifyClaims(scraped, claims, SONNET_MODEL);
      const { analysis } = await aggregate(
        scraped,
        claims,
        verification,
        SONNET_MODEL,
      );

      await db.transaction(async (tx) => {
        await tx
          .update(articles)
          .set({
            title: analysis.title,
            summary: analysis.summary,
            originalSummary: analysis.originalSummary,
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
          })
          .where(eq(articles.id, article.id));

        // Replace the claims (cascade also clears their sources).
        await tx.delete(claimsTable).where(eq(claimsTable.articleId, article.id));
        for (const [index, claim] of analysis.claims.entries()) {
          const [createdClaim] = await tx
            .insert(claimsTable)
            .values({
              articleId: article.id,
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
      });

      console.log(
        `  → ${analysis.verdict} · ${
          analysis.reliabilityScore ?? "—"
        }/100 · confidence ${analysis.globalConfidence}`,
      );
    } catch (error) {
      console.error(
        `  ✗ failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log("\nDone.");
}

rescore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
