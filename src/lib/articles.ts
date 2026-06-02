import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articleTags, articles, tags } from "@/db/schema";
import type { Verdict } from "@/lib/verdicts";

export type FeedFilter = { tag?: string; verdict?: Verdict };

// Single tag for every public read cache entry, so one revalidateTag from an
// admin mutation clears the whole feed, every article page, and slug lookups.
export const ARTICLES_CACHE_TAG = "articles";

// Background-revalidate the public reads at most this often (unstable_cache's
// revalidate option is in SECONDS, not milliseconds).
const ARTICLES_CACHE_REVALIDATE_SECONDS = 60;

const MAX_FEED_ARTICLES = 60;

async function loadPublishedArticles(filter: FeedFilter) {
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
    limit: MAX_FEED_ARTICLES,
  });
}

// unstable_cache keys on the serialized arguments plus keyParts, so each filter
// gets its own entry while sharing the single invalidation tag.
const loadPublishedArticlesCached = unstable_cache(
  loadPublishedArticles,
  ["published-articles"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

export async function getPublishedArticles(
  filter: FeedFilter = {},
): Promise<Awaited<ReturnType<typeof loadPublishedArticles>>> {
  return loadPublishedArticlesCached(filter);
}

async function loadArticleBySlug(slug: string) {
  return db.query.articles.findFirst({
    where: and(eq(articles.slug, slug), eq(articles.published, true)),
    with: {
      claims: {
        orderBy: (claim, { asc }) => [asc(claim.position)],
        with: { sources: true },
      },
      articleTags: { with: { tag: true } },
      rewrites: true,
    },
  });
}

const loadArticleBySlugCached = unstable_cache(
  loadArticleBySlug,
  ["article-by-slug"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

export async function getArticleBySlug(
  slug: string,
): Promise<Awaited<ReturnType<typeof loadArticleBySlug>>> {
  return loadArticleBySlugCached(slug);
}

async function loadAllTags() {
  return db.query.tags.findMany({
    orderBy: (tag, { asc }) => [asc(tag.label)],
  });
}

const loadAllTagsCached = unstable_cache(loadAllTags, ["all-tags"], {
  revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS,
  tags: [ARTICLES_CACHE_TAG],
});

export async function getAllTags(): Promise<
  Awaited<ReturnType<typeof loadAllTags>>
> {
  return loadAllTagsCached();
}

async function loadArticleIdBySlug(slug: string): Promise<string | null> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    columns: { id: true },
  });
  return article?.id ?? null;
}

const loadArticleIdBySlugCached = unstable_cache(
  loadArticleIdBySlug,
  ["article-id-by-slug"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

// Cached slug -> id resolver for the analytics hot path: avoids one uncached DB
// read per pageview. Publishing invalidates it via ARTICLES_CACHE_TAG.
export async function resolveArticleIdBySlug(
  slug: string,
): Promise<string | null> {
  return loadArticleIdBySlugCached(slug);
}
