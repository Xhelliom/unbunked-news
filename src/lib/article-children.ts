import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  articleKeywords,
  articleRewrites,
  claimSources,
  claims as claimsTable,
} from "@/db/schema";
import type { ClaimStatus } from "@/lib/claim-status";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The analysis children of an article, normalized so both a fresh pipeline run
// and a snapshot restore can write them through the same path.
export type ArticleAnalysisChildren = {
  keywords: string[];
  rewrites: { locale: string; title: string; body: string }[];
  claims: {
    position: number;
    claimText: string;
    status: ClaimStatus;
    explanation: string | null;
    sourceQuote: string | null;
    sources: { url: string; title: string | null; publisher: string | null }[];
  }[];
};

// Replaces an article's analysis children (claims + their sources, rewrites and
// keywords) wholesale, inside the caller's transaction. Deleting claims cascades
// to claim sources; the rest are deleted explicitly. On a just-inserted article
// the deletes are harmless no-ops. Token usage is intentionally NOT touched here
// — it is owned by the saving pipeline, not by the analysis content.
export async function replaceArticleAnalysisChildren(
  tx: DbTransaction,
  articleId: string,
  children: ArticleAnalysisChildren,
): Promise<void> {
  await tx.delete(claimsTable).where(eq(claimsTable.articleId, articleId));
  await tx
    .delete(articleRewrites)
    .where(eq(articleRewrites.articleId, articleId));
  await tx
    .delete(articleKeywords)
    .where(eq(articleKeywords.articleId, articleId));

  const keywords = [...new Set(children.keywords)].filter(Boolean);
  if (keywords.length > 0) {
    await tx
      .insert(articleKeywords)
      .values(keywords.map((keyword) => ({ articleId, keyword })))
      .onConflictDoNothing();
  }

  if (children.rewrites.length > 0) {
    await tx.insert(articleRewrites).values(
      children.rewrites.map((rewrite) => ({
        articleId,
        locale: rewrite.locale,
        title: rewrite.title,
        body: rewrite.body,
      })),
    );
  }

  for (const claim of children.claims) {
    const [created] = await tx
      .insert(claimsTable)
      .values({
        articleId,
        position: claim.position,
        claimText: claim.claimText,
        status: claim.status,
        explanation: claim.explanation,
        sourceQuote: claim.sourceQuote,
      })
      .returning({ id: claimsTable.id });

    if (claim.sources.length > 0) {
      await tx.insert(claimSources).values(
        claim.sources.map((source) => ({
          claimId: created.id,
          url: source.url,
          title: source.title,
          publisher: source.publisher,
        })),
      );
    }
  }
}
