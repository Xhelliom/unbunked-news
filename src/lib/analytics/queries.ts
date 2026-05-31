import "server-only";

import { and, count, countDistinct, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { analyticsEvents, articles } from "@/db/schema";

import { DAY_MS, TOP_LIST_LIMIT } from "./constants";

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

export type AnalyticsTotals = {
  pageviews: number;
  visitors: number;
  articleViews: number;
};

export async function loadTotals(days: number): Promise<AnalyticsTotals> {
  const [row] = await db
    .select({
      pageviews: count(),
      visitors: countDistinct(analyticsEvents.visitorHash),
      articleViews: count(analyticsEvents.articleId),
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, sinceDate(days)));

  return {
    pageviews: row?.pageviews ?? 0,
    visitors: row?.visitors ?? 0,
    articleViews: row?.articleViews ?? 0,
  };
}

export type DailyViews = { day: string; views: number };

// Continuous series (one entry per day in range, zero-filled) so the chart has
// no gaps even on quiet days.
export async function loadDailyViews(days: number): Promise<DailyViews[]> {
  const dayExpr = sql`date_trunc('day', ${analyticsEvents.createdAt})`;
  const rows = await db
    .select({
      day: sql<string>`to_char(${dayExpr}, 'YYYY-MM-DD')`,
      views: count(),
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, sinceDate(days)))
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const counts = new Map(rows.map((row) => [row.day, row.views]));
  const series: DailyViews[] = [];
  const start = Date.now() - (days - 1) * DAY_MS;
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    series.push({ day, views: counts.get(day) ?? 0 });
  }
  return series;
}

export type PathCount = { path: string; views: number };

export async function loadTopPages(days: number): Promise<PathCount[]> {
  return db
    .select({ path: analyticsEvents.path, views: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, sinceDate(days)))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

export type ReferrerCount = { host: string; views: number };

export async function loadTopReferrers(days: number): Promise<ReferrerCount[]> {
  const rows = await db
    .select({ host: analyticsEvents.referrerHost, views: count() })
    .from(analyticsEvents)
    .where(
      and(
        gte(analyticsEvents.createdAt, sinceDate(days)),
        isNotNull(analyticsEvents.referrerHost),
      ),
    )
    .groupBy(analyticsEvents.referrerHost)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);

  return rows.map((row) => ({ host: row.host ?? "", views: row.views }));
}

export type ArticleViews = {
  id: string;
  title: string;
  slug: string;
  views: number;
};

export async function loadTopArticles(days: number): Promise<ArticleViews[]> {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      views: count(),
    })
    .from(analyticsEvents)
    .innerJoin(articles, eq(analyticsEvents.articleId, articles.id))
    .where(gte(analyticsEvents.createdAt, sinceDate(days)))
    .groupBy(articles.id, articles.title, articles.slug)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

// Oldest retained event, for the retention/purge panel.
export async function loadOldestEventDate(): Promise<Date | null> {
  const [row] = await db
    .select({ oldest: sql<Date | null>`min(${analyticsEvents.createdAt})` })
    .from(analyticsEvents);
  return row?.oldest ?? null;
}
