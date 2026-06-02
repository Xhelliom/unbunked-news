import "server-only";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articleKeywords, articles } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";

// Verdicts we trust enough to recommend as "read this instead".
const TRUSTWORTHY_VERDICTS = ["reliable", "nuanced"] as const;

const MAX_SUGGESTIONS = 3;

const SUGGESTIONS_CACHE_REVALIDATE_SECONDS = 60;

async function loadSuggestedArticles(articleId: string) {
  const ownKeywords = await db
    .select({ keyword: articleKeywords.keyword })
    .from(articleKeywords)
    .where(eq(articleKeywords.articleId, articleId));

  if (ownKeywords.length === 0) return [];

  // Articles sharing at least one keyword, ranked by how many keywords overlap.
  const overlaps = await db
    .select({
      articleId: articleKeywords.articleId,
      shared: sql<number>`count(*)`.mapWith(Number),
    })
    .from(articleKeywords)
    .where(
      and(
        inArray(
          articleKeywords.keyword,
          ownKeywords.map((row) => row.keyword),
        ),
        ne(articleKeywords.articleId, articleId),
      ),
    )
    .groupBy(articleKeywords.articleId);

  if (overlaps.length === 0) return [];

  const sharedById = new Map(overlaps.map((row) => [row.articleId, row.shared]));

  const candidates = await db.query.articles.findMany({
    where: and(
      inArray(
        articles.id,
        overlaps.map((row) => row.articleId),
      ),
      eq(articles.published, true),
      isNull(articles.deletedAt),
      inArray(articles.verdict, [...TRUSTWORTHY_VERDICTS]),
    ),
    with: {
      articleTags: { with: { tag: true } },
      claims: { columns: { status: true } },
    },
  });

  return candidates
    .sort((a, b) => {
      const sharedDiff =
        (sharedById.get(b.id) ?? 0) - (sharedById.get(a.id) ?? 0);
      if (sharedDiff !== 0) return sharedDiff;
      return (b.reliabilityScore ?? 0) - (a.reliabilityScore ?? 0);
    })
    .slice(0, MAX_SUGGESTIONS);
}

const loadSuggestedArticlesCached = unstable_cache(
  loadSuggestedArticles,
  ["suggested-articles"],
  {
    revalidate: SUGGESTIONS_CACHE_REVALIDATE_SECONDS,
    tags: [ARTICLES_CACHE_TAG],
  },
);

export async function getSuggestedArticles(
  articleId: string,
): Promise<Awaited<ReturnType<typeof loadSuggestedArticles>>> {
  return loadSuggestedArticlesCached(articleId);
}
