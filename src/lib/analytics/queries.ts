import "server-only";

import { and, count, countDistinct, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { analyticsEvents, articles } from "@/db/schema";
import type { DeviceType } from "./constants";

import { DAY_MS, TOP_LIST_LIMIT } from "./constants";

// Time window [now - (offsetDays + days), now - offsetDays). offsetDays lets us
// fetch the immediately-preceding period for comparison KPIs.
function rangeWhere(days: number, offsetDays = 0) {
  const end = new Date(Date.now() - offsetDays * DAY_MS);
  const start = new Date(end.getTime() - days * DAY_MS);
  return and(
    gte(analyticsEvents.createdAt, start),
    lt(analyticsEvents.createdAt, end),
  );
}

export type VisitMetrics = {
  visits: number;
  pageviews: number;
  bounceRate: number;
  viewsPerVisit: number;
};

// One visitor hash already encodes the UTC day, so a distinct hash is a visit.
// Bounce = a visit with a single pageview.
export async function loadVisitMetrics(
  days: number,
  offsetDays = 0,
): Promise<VisitMetrics> {
  const perVisit = db.$with("per_visit").as(
    db
      .select({
        visitorHash: analyticsEvents.visitorHash,
        views: count().as("views"),
      })
      .from(analyticsEvents)
      .where(rangeWhere(days, offsetDays))
      .groupBy(analyticsEvents.visitorHash),
  );

  const [row] = await db
    .with(perVisit)
    .select({
      visits: count(),
      pageviews: sql<number>`coalesce(sum(${perVisit.views}), 0)::int`,
      bounces: sql<number>`count(*) filter (where ${perVisit.views} = 1)::int`,
    })
    .from(perVisit);

  const visits = row?.visits ?? 0;
  const pageviews = row?.pageviews ?? 0;
  const bounces = row?.bounces ?? 0;
  return {
    visits,
    pageviews,
    bounceRate: visits > 0 ? bounces / visits : 0,
    viewsPerVisit: visits > 0 ? pageviews / visits : 0,
  };
}

export type Kpis = { current: VisitMetrics; previous: VisitMetrics };

export async function loadKpis(days: number): Promise<Kpis> {
  const [current, previous] = await Promise.all([
    loadVisitMetrics(days, 0),
    loadVisitMetrics(days, days),
  ]);
  return { current, previous };
}

export async function loadArticleViews(days: number): Promise<number> {
  const [row] = await db
    .select({ views: count(analyticsEvents.articleId) })
    .from(analyticsEvents)
    .where(rangeWhere(days));
  return row?.views ?? 0;
}

export type DailyPoint = { day: string; pageviews: number; visitors: number };

// Continuous series (zero-filled) of pageviews and unique visitors per day.
export async function loadDailySeries(days: number): Promise<DailyPoint[]> {
  const dayExpr = sql`date_trunc('day', ${analyticsEvents.createdAt})`;
  const rows = await db
    .select({
      day: sql<string>`to_char(${dayExpr}, 'YYYY-MM-DD')`,
      pageviews: count(),
      visitors: countDistinct(analyticsEvents.visitorHash),
    })
    .from(analyticsEvents)
    .where(rangeWhere(days))
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const byDay = new Map(rows.map((row) => [row.day, row]));
  const series: DailyPoint[] = [];
  const start = Date.now() - (days - 1) * DAY_MS;
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    const row = byDay.get(day);
    series.push({
      day,
      pageviews: row?.pageviews ?? 0,
      visitors: row?.visitors ?? 0,
    });
  }
  return series;
}

export type PathCount = { path: string; views: number };

export async function loadTopPages(days: number): Promise<PathCount[]> {
  return db
    .select({ path: analyticsEvents.path, views: count() })
    .from(analyticsEvents)
    .where(rangeWhere(days))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

// Landing pages: the first pageview of each visit, by count.
export async function loadTopEntryPages(days: number): Promise<PathCount[]> {
  const start = new Date(Date.now() - days * DAY_MS);
  const result = await db.execute(sql`
    SELECT path, count(*)::int AS views
    FROM (
      SELECT DISTINCT ON (visitor_hash) visitor_hash, path
      FROM analytics_events
      WHERE created_at >= ${start}
      ORDER BY visitor_hash, created_at ASC
    ) firsts
    GROUP BY path
    ORDER BY views DESC
    LIMIT ${TOP_LIST_LIMIT}
  `);
  return Array.from(result as Iterable<Record<string, unknown>>).map((row) => ({
    path: String(row.path),
    views: Number(row.views),
  }));
}

export type ReferrerCount = { host: string; views: number };

export async function loadTopReferrers(days: number): Promise<ReferrerCount[]> {
  const rows = await db
    .select({ host: analyticsEvents.referrerHost, views: count() })
    .from(analyticsEvents)
    .where(and(rangeWhere(days), isNotNull(analyticsEvents.referrerHost)))
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
    .where(rangeWhere(days))
    .groupBy(articles.id, articles.title, articles.slug)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

export type DeviceCount = { deviceType: DeviceType; views: number };

export async function loadDeviceBreakdown(days: number): Promise<DeviceCount[]> {
  return db
    .select({ deviceType: analyticsEvents.deviceType, views: count() })
    .from(analyticsEvents)
    .where(rangeWhere(days))
    .groupBy(analyticsEvents.deviceType)
    .orderBy(desc(count()));
}

export type LocaleCount = { locale: string; views: number };

export async function loadLocaleBreakdown(days: number): Promise<LocaleCount[]> {
  return db
    .select({ locale: analyticsEvents.locale, views: count() })
    .from(analyticsEvents)
    .where(rangeWhere(days))
    .groupBy(analyticsEvents.locale)
    .orderBy(desc(count()));
}

// Oldest retained event, for the retention/purge panel.
export async function loadOldestEventDate(): Promise<Date | null> {
  const [row] = await db
    .select({ oldest: sql<Date | null>`min(${analyticsEvents.createdAt})` })
    .from(analyticsEvents);
  return row?.oldest ?? null;
}
