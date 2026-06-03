import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import { analyticsEvents, articles, claims } from "@/db/schema";
import { DAY_MS, EVENT_PAGEVIEW, EVENT_READ } from "@/lib/analytics/constants";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/claim-status";

import {
  type ClaimCounts,
  type DashboardArticle,
  type DashboardSort,
  type StatusFilter,
  TRASH_VIEW,
} from "./dashboard-params";
import type { Verdict } from "@/lib/verdicts";

// The dashboard is a working queue, not an archive: cap the rows we render and
// rely on the filters/sort to surface what matters. No pagination yet.
export const DASHBOARD_LIMIT = 100;
// Window for the "recent views" column and the low-score-high-traffic flag.
export const RECENT_VIEWS_DAYS = 7;
// Window for the "published recently" KPI.
export const KPI_WINDOW_DAYS = 30;
// How far back the publishing-activity heatmap reaches.
export const ACTIVITY_DAYS = 182;

type LoadOptions = {
  view: string | undefined;
  sort: DashboardSort;
  verdict: Verdict | null;
  status: StatusFilter | null;
  flagReview: boolean;
};

function emptyClaimCounts(): ClaimCounts {
  const base = Object.fromEntries(
    CLAIM_STATUSES.map((status) => [status, 0]),
  ) as Record<ClaimStatus, number>;
  return { ...base, total: 0 };
}

export async function loadDashboardArticles(
  options: LoadOptions,
): Promise<DashboardArticle[]> {
  const { view, sort, verdict, status, flagReview } = options;
  const showTrash = view === TRASH_VIEW;
  const recentStart = new Date(Date.now() - RECENT_VIEWS_DAYS * DAY_MS);

  // Per-article engagement, aggregated once for every article so the table can
  // both display and sort by it without an N+1 over the rows.
  const viewAgg = db.$with("view_agg").as(
    db
      .select({
        articleId: analyticsEvents.articleId,
        views: sql<number>`count(*) filter (where ${analyticsEvents.kind} = ${EVENT_PAGEVIEW})::int`.as(
          "views",
        ),
        reads: sql<number>`count(*) filter (where ${analyticsEvents.kind} = ${EVENT_READ})::int`.as(
          "reads",
        ),
        recentViews:
          sql<number>`count(*) filter (where ${analyticsEvents.kind} = ${EVENT_PAGEVIEW} and ${gte(analyticsEvents.createdAt, recentStart)})::int`.as(
            "recent_views",
          ),
      })
      .from(analyticsEvents)
      .where(isNotNull(analyticsEvents.articleId))
      .groupBy(analyticsEvents.articleId),
  );

  const conditions: SQL[] = [
    showTrash ? isNotNull(articles.deletedAt) : isNull(articles.deletedAt),
  ];
  if (verdict) {
    conditions.push(eq(articles.verdict, verdict));
  }
  if (status === "published") {
    conditions.push(eq(articles.published, true));
  } else if (status === "draft") {
    conditions.push(eq(articles.published, false));
  }
  if (flagReview) {
    const killswitch = or(
      eq(articles.fabricationDetected, true),
      eq(articles.domainImpersonation, true),
      eq(articles.centralClaimDebunked, true),
      eq(articles.undisclosedAIWithErrors, true),
    );
    if (killswitch) {
      conditions.push(killswitch);
    }
  }

  const datePivot = sql`coalesce(${articles.publishedAt}, ${articles.createdAt})`;
  const viewsExpr = sql`coalesce(${viewAgg.views}, 0)`;
  const trashDate = articles.deletedAt;
  let orderBy: SQL[];
  if (sort === "views") {
    orderBy = [desc(viewsExpr)];
  } else if (sort === "score") {
    orderBy = [sql`${articles.reliabilityScore} desc nulls last`];
  } else if (sort === "oldest") {
    orderBy = [asc(showTrash ? trashDate : datePivot)];
  } else {
    orderBy = [desc(showTrash ? trashDate : datePivot)];
  }

  const rows = await db
    .with(viewAgg)
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      sourceName: articles.sourceName,
      locale: articles.locale,
      verdict: articles.verdict,
      reliabilityScore: articles.reliabilityScore,
      published: articles.published,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      deletedAt: articles.deletedAt,
      imageUrl: articles.imageUrl,
      fabricationDetected: articles.fabricationDetected,
      domainImpersonation: articles.domainImpersonation,
      centralClaimDebunked: articles.centralClaimDebunked,
      undisclosedAIWithErrors: articles.undisclosedAIWithErrors,
      views: sql<number>`coalesce(${viewAgg.views}, 0)::int`,
      reads: sql<number>`coalesce(${viewAgg.reads}, 0)::int`,
      recentViews: sql<number>`coalesce(${viewAgg.recentViews}, 0)::int`,
    })
    .from(articles)
    .leftJoin(viewAgg, eq(viewAgg.articleId, articles.id))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(DASHBOARD_LIMIT);

  const ids = rows.map((row) => row.id);
  const claimsByArticle = new Map<string, ClaimCounts>(
    ids.map((id) => [id, emptyClaimCounts()]),
  );
  if (ids.length > 0) {
    const claimRows = await db
      .select({
        articleId: claims.articleId,
        status: claims.status,
        total: count(),
      })
      .from(claims)
      .where(inArray(claims.articleId, ids))
      .groupBy(claims.articleId, claims.status);
    for (const row of claimRows) {
      const counts = claimsByArticle.get(row.articleId);
      if (!counts) {
        continue;
      }
      counts[row.status] = row.total;
      counts.total += row.total;
    }
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    sourceName: row.sourceName,
    locale: row.locale,
    verdict: row.verdict,
    reliabilityScore: row.reliabilityScore,
    published: row.published,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
    hasImage: row.imageUrl !== null,
    killswitch:
      row.fabricationDetected ||
      row.domainImpersonation ||
      row.centralClaimDebunked ||
      row.undisclosedAIWithErrors,
    views: row.views,
    reads: row.reads,
    recentViews: row.recentViews,
    claims: claimsByArticle.get(row.id) ?? emptyClaimCounts(),
  }));
}

export type EditorialKpis = {
  published: number;
  drafts: number;
  avgScore: number | null;
  needsReview: number;
  publishedRecently: number;
};

export async function loadEditorialKpis(): Promise<EditorialKpis> {
  const recentStart = new Date(Date.now() - KPI_WINDOW_DAYS * DAY_MS);
  const [row] = await db
    .select({
      published: sql<number>`count(*) filter (where ${articles.published})::int`,
      drafts: sql<number>`count(*) filter (where not ${articles.published})::int`,
      avgScore: sql<
        number | null
      >`avg(${articles.reliabilityScore}) filter (where ${articles.published})::float`,
      needsReview: sql<number>`count(*) filter (where ${articles.fabricationDetected} or ${articles.domainImpersonation} or ${articles.centralClaimDebunked} or ${articles.undisclosedAIWithErrors})::int`,
      publishedRecently: sql<number>`count(*) filter (where ${gte(articles.publishedAt, recentStart)})::int`,
    })
    .from(articles)
    .where(isNull(articles.deletedAt));

  return {
    published: row?.published ?? 0,
    drafts: row?.drafts ?? 0,
    avgScore: row?.avgScore ?? null,
    needsReview: row?.needsReview ?? 0,
    publishedRecently: row?.publishedRecently ?? 0,
  };
}

export type ActivityPoint = { day: string; count: number };

// Articles published per UTC day over the window, zero-filled, for the
// GitHub-style publishing-activity heatmap.
export async function loadPublishingActivity(
  days: number,
): Promise<ActivityPoint[]> {
  const start = new Date(Date.now() - (days - 1) * DAY_MS);
  const dayExpr = sql<string>`to_char(date_trunc('day', ${articles.publishedAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day: dayExpr, count: count() })
    .from(articles)
    .where(
      and(
        isNull(articles.deletedAt),
        isNotNull(articles.publishedAt),
        gte(articles.publishedAt, start),
      ),
    )
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const byDay = new Map(rows.map((row) => [row.day, row.count]));
  const series: ActivityPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start.getTime() + i * DAY_MS)
      .toISOString()
      .slice(0, 10);
    series.push({ day, count: byDay.get(day) ?? 0 });
  }
  return series;
}
