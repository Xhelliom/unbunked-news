import "server-only";

import { and, count, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { DAY_MS } from "@/lib/analytics/constants";
import type { Rubric } from "@/lib/rubrics";
import type { Verdict } from "@/lib/verdicts";

export type FeedFilter = { rubric?: Rubric; verdict?: Verdict };

// Single tag for every public read cache entry, so one revalidateTag from an
// admin mutation clears the whole feed, every article page, and slug lookups.
export const ARTICLES_CACHE_TAG = "articles";

// Background-revalidate the public reads at most this often (unstable_cache's
// revalidate option is in SECONDS, not milliseconds).
const ARTICLES_CACHE_REVALIDATE_SECONDS = 60;

const MAX_FEED_ARTICLES = 60;

// Fenêtre glissante affichée sur la page login (« cette semaine »).
const LOGIN_WEEKLY_PUBLISHED_WINDOW_MS = 7 * DAY_MS;

async function loadPublishedArticles(filter: FeedFilter) {
  const conditions = [
    eq(articles.published, true),
    isNull(articles.deletedAt),
  ];

  if (filter.verdict) {
    conditions.push(eq(articles.verdict, filter.verdict));
  }

  if (filter.rubric) {
    conditions.push(eq(articles.rubric, filter.rubric));
  }

  return db.query.articles.findMany({
    where: and(...conditions),
    orderBy: (article, { desc }) => [desc(article.publishedAt)],
    with: {
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
  // unstable_cache serializes its value to JSON, which turns Date columns into
  // ISO strings. Revive them so the Date-typed contract holds at runtime.
  const rows = await loadPublishedArticlesCached(filter);
  return rows.map((row) => ({
    ...row,
    publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

async function loadArticleBySlug(slug: string) {
  return db.query.articles.findFirst({
    where: and(
      eq(articles.slug, slug),
      eq(articles.published, true),
      isNull(articles.deletedAt),
    ),
    with: {
      claims: {
        orderBy: (claim, { asc }) => [asc(claim.position)],
        with: { sources: true },
      },
      rewrites: true,
    },
  });
}

const loadArticleBySlugCached = unstable_cache(
  loadArticleBySlug,
  ["article-by-slug"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

// The article shape (with claims, sources and rewrites) the reader-facing
// ArticleView renders, derived from the public query so the admin preview and
// the public page share one contract.
export type PublicArticle = NonNullable<
  Awaited<ReturnType<typeof loadArticleBySlug>>
>;

// Admin-only: load any article by id — published or not, trashed or not — with
// the same relations the public page reads, so an admin can preview the exact
// reader view of a draft before publishing. Not cached: it's an authenticated
// admin read and must reflect unsaved-then-saved edits immediately.
export async function loadArticleForPreview(
  id: string,
): Promise<PublicArticle | null> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, id),
    with: {
      claims: {
        orderBy: (claim, { asc }) => [asc(claim.position)],
        with: { sources: true },
      },
      rewrites: true,
    },
  });
  return article ?? null;
}

export async function getArticleBySlug(
  slug: string,
): Promise<Awaited<ReturnType<typeof loadArticleBySlug>>> {
  // See getPublishedArticles: revive Date columns flattened to strings by the
  // unstable_cache JSON round-trip.
  const article = await loadArticleBySlugCached(slug);
  if (!article) return article;
  return {
    ...article,
    publishedAt: article.publishedAt === null ? null : new Date(article.publishedAt),
    createdAt: new Date(article.createdAt),
    updatedAt: new Date(article.updatedAt),
  };
}

export type SitemapArticle = {
  slug: string;
  locale: string;
  updatedAt: Date;
};

async function loadPublishedArticlesForSitemap(): Promise<SitemapArticle[]> {
  const rows = await db.query.articles.findMany({
    where: and(eq(articles.published, true), isNull(articles.deletedAt)),
    columns: { slug: true, locale: true, updatedAt: true },
    orderBy: (article, { desc }) => [desc(article.publishedAt)],
  });
  return rows.map((row) => ({
    slug: row.slug,
    locale: row.locale,
    updatedAt: new Date(row.updatedAt),
  }));
}

const loadPublishedArticlesForSitemapCached = unstable_cache(
  loadPublishedArticlesForSitemap,
  ["published-articles-sitemap"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

// Every published, non-trashed article (slug + locale + lastmod) for the XML
// sitemap. Not capped like the feed: search engines need the full set.
export async function getPublishedArticlesForSitemap(): Promise<
  SitemapArticle[]
> {
  return loadPublishedArticlesForSitemapCached();
}

async function loadArticleIdBySlug(slug: string): Promise<string | null> {
  const article = await db.query.articles.findFirst({
    where: and(eq(articles.slug, slug), isNull(articles.deletedAt)),
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

async function loadPublishedArticlesCountLastSevenDays(): Promise<number> {
  const since = new Date(Date.now() - LOGIN_WEEKLY_PUBLISHED_WINDOW_MS);
  const [row] = await db
    .select({ total: count() })
    .from(articles)
    .where(
      and(
        eq(articles.published, true),
        isNull(articles.deletedAt),
        isNotNull(articles.publishedAt),
        gte(articles.publishedAt, since),
      ),
    );
  return row?.total ?? 0;
}

const loadPublishedArticlesCountLastSevenDaysCached = unstable_cache(
  loadPublishedArticlesCountLastSevenDays,
  ["published-articles-weekly-count"],
  { revalidate: ARTICLES_CACHE_REVALIDATE_SECONDS, tags: [ARTICLES_CACHE_TAG] },
);

/** Articles publiés sur les 7 derniers jours (stat vivante de la page login). */
export async function getPublishedArticlesCountLastSevenDays(): Promise<number> {
  return loadPublishedArticlesCountLastSevenDaysCached();
}
