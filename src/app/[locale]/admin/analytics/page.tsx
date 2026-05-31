import { getFormatter, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RETENTION_DAYS,
  parseRange,
} from "@/lib/analytics/constants";
import {
  loadArticleViews,
  loadDailySeries,
  loadDeviceBreakdown,
  loadKpis,
  loadLocaleBreakdown,
  loadOldestEventDate,
  loadTopArticles,
  loadTopEntryPages,
  loadTopPages,
  loadTopReferrers,
} from "@/lib/analytics/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsBarChart } from "@/components/admin/analytics-bar-chart";
import { AnalyticsBreakdowns } from "@/components/admin/analytics-breakdowns";
import { AnalyticsKpiCard } from "@/components/admin/analytics-kpi-card";

import { purgeOldEvents } from "./actions";

function deltaPct(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export default async function AdminAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const days = parseRange(rangeParam);

  const t = await getTranslations("admin.analytics");
  const format = await getFormatter();

  const [
    kpis,
    articleViews,
    daily,
    topArticles,
    topPages,
    topReferrers,
    entryPages,
    devices,
    locales,
    oldest,
  ] = await Promise.all([
    loadKpis(days),
    loadArticleViews(days),
    loadDailySeries(days),
    loadTopArticles(days),
    loadTopPages(days),
    loadTopReferrers(days),
    loadTopEntryPages(days),
    loadDeviceBreakdown(days),
    loadLocaleBreakdown(days),
    loadOldestEventDate(),
  ]);

  const { current, previous } = kpis;
  const formatNumber = (value: number) => format.number(value);
  const formatDay = (iso: string) =>
    format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  const kpiCards: {
    key: "visitors" | "pageviews" | "viewsPerVisit" | "bounceRate";
    value: string;
    deltaPct: number | null;
    goodDirection: "up" | "down";
  }[] = [
    {
      key: "visitors",
      value: formatNumber(current.visits),
      deltaPct: deltaPct(current.visits, previous.visits),
      goodDirection: "up" as const,
    },
    {
      key: "pageviews",
      value: formatNumber(current.pageviews),
      deltaPct: deltaPct(current.pageviews, previous.pageviews),
      goodDirection: "up" as const,
    },
    {
      key: "viewsPerVisit",
      value: format.number(current.viewsPerVisit, { maximumFractionDigits: 1 }),
      deltaPct: deltaPct(current.viewsPerVisit, previous.viewsPerVisit),
      goodDirection: "up" as const,
    },
    {
      key: "bounceRate",
      value: format.number(current.bounceRate, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
      deltaPct: deltaPct(current.bounceRate, previous.bounceRate),
      goodDirection: "down" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <nav className="flex items-center gap-1" aria-label={t("rangeLabel")}>
          {ANALYTICS_RANGES.map((value) => (
            <Link
              key={value}
              href={`/admin/analytics?range=${value}`}
              aria-current={value === days ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors",
                value === days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("rangeDays", { days: value })}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <AnalyticsKpiCard
            key={card.key}
            label={t(`summary.${card.key}`)}
            value={card.value}
            deltaPct={card.deltaPct}
            goodDirection={card.goodDirection}
            deltaLabel={t("deltaLabel")}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
          <CardDescription>
            {t("articleViews", { count: articleViews })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsBarChart
            data={daily}
            pageviewsLabel={t("summary.pageviews")}
            visitorsLabel={t("summary.visitors")}
            emptyLabel={t("noData")}
            formatDay={formatDay}
          />
        </CardContent>
      </Card>

      <AnalyticsBreakdowns
        articles={topArticles}
        referrers={topReferrers}
        pages={topPages}
        entryPages={entryPages}
        devices={devices}
        locales={locales}
        deviceLabel={(type) => t(`deviceTypes.${type}`)}
        formatNumber={formatNumber}
        labels={{
          topArticles: t("topArticles"),
          topReferrers: t("topReferrers"),
          topPages: t("topPages"),
          entryPages: t("entryPages"),
          devices: t("devices"),
          languages: t("languages"),
          noData: t("noData"),
          noReferrers: t("noReferrers"),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("privacy.title")}</CardTitle>
          <CardDescription>{t("privacy.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {oldest
              ? t("privacy.oldest", {
                  date: format.dateTime(oldest, { dateStyle: "long" }),
                  days: ANALYTICS_RETENTION_DAYS,
                })
              : t("privacy.retention", { days: ANALYTICS_RETENTION_DAYS })}
          </p>
          <form action={purgeOldEvents}>
            <Button type="submit" variant="outline" size="sm">
              {t("privacy.purge")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
