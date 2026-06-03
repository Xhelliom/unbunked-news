import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { searchMatchSql, searchRankSql } from "@/lib/search-query";

const MAX_SEARCH_RESULTS = 40;

// Searches across every locale (not just the current one): the tsvector is a
// single french config, so EN stemming is approximate, but a reader gets hits
// regardless of the article's language.
export async function getSearchResults(rawQuery: string) {
  const query = rawQuery.trim();
  // plainto_tsquery('') matches nothing; skip the round-trip for blank input.
  if (query.length === 0) return [];

  return db.query.articles.findMany({
    where: and(
      eq(articles.published, true),
      isNull(articles.deletedAt),
      searchMatchSql(query),
    ),
    orderBy: sql`${searchRankSql(query)} desc`,
    with: {
      // Same shape as getPublishedArticles so ArticleCard renders search hits.
      claims: { columns: { status: true } },
    },
    limit: MAX_SEARCH_RESULTS,
  });
}
