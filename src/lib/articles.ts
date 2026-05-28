import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { articleTags, articles, tags } from "@/db/schema";
import type { Verdict } from "@/lib/verdicts";

export type FeedFilter = { tag?: string; verdict?: Verdict };

export async function getPublishedArticles(filter: FeedFilter = {}) {
  const conditions = [eq(articles.published, true)];

  if (filter.verdict) {
    conditions.push(eq(articles.verdict, filter.verdict));
  }

  if (filter.tag) {
    const tag = await db.query.tags.findFirst({
      where: eq(tags.slug, filter.tag),
    });
    if (!tag) return [];
    const rows = await db
      .select({ articleId: articleTags.articleId })
      .from(articleTags)
      .where(eq(articleTags.tagId, tag.id));
    if (rows.length === 0) return [];
    conditions.push(
      inArray(
        articles.id,
        rows.map((row) => row.articleId),
      ),
    );
  }

  return db.query.articles.findMany({
    where: and(...conditions),
    orderBy: (article, { desc }) => [desc(article.publishedAt)],
    with: {
      articleTags: { with: { tag: true } },
      // Only the status is needed to render the claim-breakdown strip on cards.
      claims: { columns: { status: true } },
    },
    limit: 60,
  });
}

export async function getArticleBySlug(slug: string) {
  return db.query.articles.findFirst({
    where: and(eq(articles.slug, slug), eq(articles.published, true)),
    with: {
      claims: {
        orderBy: (claim, { asc }) => [asc(claim.position)],
        with: { sources: true },
      },
      articleTags: { with: { tag: true } },
    },
  });
}

export async function getAllTags() {
  return db.query.tags.findMany({
    orderBy: (tag, { asc }) => [asc(tag.label)],
  });
}
