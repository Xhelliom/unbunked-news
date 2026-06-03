import "server-only";

import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import { analyticsEvents, articles, proposals } from "@/db/schema";
import type { Rubric } from "@/lib/rubrics";
import type { Verdict } from "@/lib/verdicts";

import {
  DAY_MS,
  EVENT_PAGEVIEW,
  EVENT_READ,
  HOURS_PER_DAY,
  TOP_LIST_LIMIT,
  type DeviceType,
} from "./constants";

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

// Most stats are about page hits; "read" events are counted separately.
function pageviewWhere(days: number, offsetDays = 0) {
  return and(rangeWhere(days, offsetDays), eq(analyticsEvents.kind, EVENT_PAGEVIEW));
}

// UTC day, matching the day the visitor hash rotates on, so chart buckets and
// the zero-filled series keys always line up regardless of the DB timezone.
const UTC_DAY = sql`date_trunc('day', ${analyticsEvents.createdAt} at time zone 'UTC')`;

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
      .where(pageviewWhere(days, offsetDays))
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

export type ArticleEngagement = {
  views: number;
  reads: number;
  readRate: number;
};

// Article pageviews vs "read to the end" events, for a read-through rate.
export async function loadArticleEngagement(
  days: number,
): Promise<ArticleEngagement> {
  const [row] = await db
    .select({
      views: sql<number>`count(*) filter (where ${analyticsEvents.kind} = ${EVENT_PAGEVIEW})::int`,
      reads: sql<number>`count(*) filter (where ${analyticsEvents.kind} = ${EVENT_READ})::int`,
    })
    .from(analyticsEvents)
    .where(and(rangeWhere(days), isNotNull(analyticsEvents.articleId)));

  const views = row?.views ?? 0;
  const reads = row?.reads ?? 0;
  return { views, reads, readRate: views > 0 ? reads / views : 0 };
}

export type DailyPoint = { day: string; pageviews: number; visitors: number };

// Continuous series (zero-filled) of pageviews and unique visitors per day.
export async function loadDailySeries(days: number): Promise<DailyPoint[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(${UTC_DAY}, 'YYYY-MM-DD')`,
      pageviews: count(),
      visitors: countDistinct(analyticsEvents.visitorHash),
    })
    .from(analyticsEvents)
    .where(pageviewWhere(days))
    .groupBy(UTC_DAY)
    .orderBy(UTC_DAY);

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

// Pageviews per UTC hour-of-day (0-23), zero-filled.
export async function loadHourlyDistribution(days: number): Promise<number[]> {
  const hourExpr = sql<number>`extract(hour from ${analyticsEvents.createdAt} at time zone 'UTC')::int`;
  const rows = await db
    .select({ hour: hourExpr, views: count() })
    .from(analyticsEvents)
    .where(pageviewWhere(days))
    .groupBy(hourExpr)
    .orderBy(hourExpr);

  const byHour = new Map(rows.map((row) => [row.hour, row.views]));
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => byHour.get(hour) ?? 0);
}

export type PathCount = { path: string; views: number };

export async function loadTopPages(days: number): Promise<PathCount[]> {
  return db
    .select({ path: analyticsEvents.path, views: count() })
    .from(analyticsEvents)
    .where(pageviewWhere(days))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

// First (entry) or last (exit) pageview of each visit, by count.
async function loadEdgePages(
  days: number,
  edge: "ASC" | "DESC",
): Promise<PathCount[]> {
  const start = new Date(Date.now() - days * DAY_MS);
  const orderDirection = edge === "ASC" ? sql`asc` : sql`desc`;

  // We rank pageviews inside each visitor/day visit and keep rank 1:
  // first page (ASC) for entry pages, last page (DESC) for exit pages.
  const rankedEdges = db.$with("ranked_edges").as(
    db
      .select({
        path: analyticsEvents.path,
        rank: sql<number>`row_number() over (
          partition by ${analyticsEvents.visitorHash}
          order by ${analyticsEvents.createdAt} ${orderDirection}
        )`.as("rank"),
      })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.createdAt, start),
          eq(analyticsEvents.kind, EVENT_PAGEVIEW),
        ),
      ),
  );

  const rows = await db
    .with(rankedEdges)
    .select({
      path: rankedEdges.path,
      views: count(),
    })
    .from(rankedEdges)
    .where(eq(rankedEdges.rank, 1))
    .groupBy(rankedEdges.path)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);

  return rows.map((row) => ({
    path: row.path ?? "",
    views: row.views,
  }));
}

export function loadTopEntryPages(days: number): Promise<PathCount[]> {
  return loadEdgePages(days, "ASC");
}

export function loadTopExitPages(days: number): Promise<PathCount[]> {
  return loadEdgePages(days, "DESC");
}

export type ReferrerCount = { host: string; views: number };

export async function loadTopReferrers(days: number): Promise<ReferrerCount[]> {
  const rows = await db
    .select({ host: analyticsEvents.referrerHost, views: count() })
    .from(analyticsEvents)
    .where(and(pageviewWhere(days), isNotNull(analyticsEvents.referrerHost)))
    .groupBy(analyticsEvents.referrerHost)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
  return rows.map((row) => ({ host: row.host ?? "", views: row.views }));
}

// Pageviews with no external referrer — i.e. direct / bookmarked traffic.
export async function loadDirectCount(days: number): Promise<number> {
  const [row] = await db
    .select({ views: count() })
    .from(analyticsEvents)
    .where(and(pageviewWhere(days), isNull(analyticsEvents.referrerHost)));
  return row?.views ?? 0;
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
    .where(pageviewWhere(days))
    .groupBy(articles.id, articles.title, articles.slug)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
}

export type VerdictCount = { verdict: Verdict; views: number };

export async function loadVerdictBreakdown(
  days: number,
): Promise<VerdictCount[]> {
  const rows = await db
    .select({ verdict: articles.verdict, views: count() })
    .from(analyticsEvents)
    .innerJoin(articles, eq(analyticsEvents.articleId, articles.id))
    .where(and(pageviewWhere(days), isNotNull(articles.verdict)))
    .groupBy(articles.verdict)
    .orderBy(desc(count()));
  return rows.flatMap((row) =>
    row.verdict ? [{ verdict: row.verdict, views: row.views }] : [],
  );
}

export type RubricCount = { rubric: Rubric; views: number };

export async function loadRubricBreakdown(
  days: number,
): Promise<RubricCount[]> {
  const rows = await db
    .select({ rubric: articles.rubric, views: count() })
    .from(analyticsEvents)
    .innerJoin(articles, eq(analyticsEvents.articleId, articles.id))
    .where(and(pageviewWhere(days), isNotNull(articles.rubric)))
    .groupBy(articles.rubric)
    .orderBy(desc(count()))
    .limit(TOP_LIST_LIMIT);
  return rows.flatMap((row) =>
    row.rubric ? [{ rubric: row.rubric, views: row.views }] : [],
  );
}

export type DeviceCount = { deviceType: DeviceType; views: number };

export async function loadDeviceBreakdown(days: number): Promise<DeviceCount[]> {
  return db
    .select({ deviceType: analyticsEvents.deviceType, views: count() })
    .from(analyticsEvents)
    .where(pageviewWhere(days))
    .groupBy(analyticsEvents.deviceType)
    .orderBy(desc(count()));
}

export type LocaleCount = { locale: string; views: number };

export async function loadLocaleBreakdown(days: number): Promise<LocaleCount[]> {
  return db
    .select({ locale: analyticsEvents.locale, views: count() })
    .from(analyticsEvents)
    .where(pageviewWhere(days))
    .groupBy(analyticsEvents.locale)
    .orderBy(desc(count()));
}

// Article proposals submitted in the window — a privacy-free conversion goal.
export async function loadProposalsCount(days: number): Promise<number> {
  const start = new Date(Date.now() - days * DAY_MS);
  const [row] = await db
    .select({ total: count() })
    .from(proposals)
    .where(gte(proposals.createdAt, start));
  return row?.total ?? 0;
}

// Oldest retained event, for the retention/purge panel.
export async function loadOldestEventDate(): Promise<Date | null> {
  const [row] = await db
    .select({ oldest: sql<Date | null>`min(${analyticsEvents.createdAt})` })
    .from(analyticsEvents);
  return row?.oldest ?? null;
}
