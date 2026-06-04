import { getFormatter, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RETENTION_DAYS,
  parseRange,
} from "@/lib/analytics/constants";
import {
  loadArticleEngagement,
  loadDailySeries,
  loadDeviceBreakdown,
  loadDirectCount,
  loadHourlyDistribution,
  loadKpis,
  loadLocaleBreakdown,
  loadOldestEventDate,
  loadProposalsCount,
  loadRubricBreakdown,
  loadTopArticles,
  loadTopEntryPages,
  loadTopExitPages,
  loadTopPages,
  loadTopReferrers,
  loadVerdictBreakdown,
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
import { AnalyticsHourlyChart } from "@/components/admin/analytics-hourly-chart";
import { AnalyticsKpiRow } from "@/components/admin/analytics-kpi-row";

import { purgeOldEvents } from "./actions";

export default async function AdminAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const days = parseRange(rangeParam);

  const t = await getTranslations("admin.analytics");
  const tv = await getTranslations("verdicts");
  const trub = await getTranslations("rubrics");
  const format = await getFormatter();

  const [
    kpis,
    engagement,
    proposalsCount,
    daily,
    hourly,
    topArticles,
    verdicts,
    topics,
    referrers,
    directCount,
    topPages,
    entryPages,
    exitPages,
    devices,
    locales,
    oldest,
  ] = await Promise.all([
    loadKpis(days),
    loadArticleEngagement(days),
    loadProposalsCount(days),
    loadDailySeries(days),
    loadHourlyDistribution(days),
    loadTopArticles(days),
    loadVerdictBreakdown(days),
    loadRubricBreakdown(days),
    loadTopReferrers(days),
    loadDirectCount(days),
    loadTopPages(days),
    loadTopEntryPages(days),
    loadTopExitPages(days),
    loadDeviceBreakdown(days),
    loadLocaleBreakdown(days),
    loadOldestEventDate(),
  ]);

  const { current, previous } = kpis;
  const formatNumber = (value: number) => format.number(value);
  const formatPercent = (value: number) =>
    format.number(value, { style: "percent", maximumFractionDigits: 1 });
  const formatDecimal = (value: number) =>
    format.number(value, { maximumFractionDigits: 1 });
  const formatDay = (iso: string) =>
    format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  const secondaryStats: {
    key: "articleViews" | "readRate" | "proposals" | "conversion";
    value: string;
  }[] = [
    { key: "articleViews", value: formatNumber(engagement.views) },
    { key: "readRate", value: formatPercent(engagement.readRate) },
    { key: "proposals", value: formatNumber(proposalsCount) },
    {
      key: "conversion",
      value: formatPercent(
        current.visits > 0 ? proposalsCount / current.visits : 0,
      ),
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

      <AnalyticsKpiRow
        current={current}
        previous={previous}
        formatNumber={formatNumber}
        formatPercent={formatPercent}
        formatDecimal={formatDecimal}
        labels={{
          visitors: t("summary.visitors"),
          pageviews: t("summary.pageviews"),
          viewsPerVisit: t("summary.viewsPerVisit"),
          bounceRate: t("summary.bounceRate"),
          delta: t("deltaLabel"),
        }}
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {secondaryStats.map((stat) => (
            <div key={stat.key} className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {t(`secondary.${stat.key}`)}
              </p>
              <p className="text-xl font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("chartTitle")}</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>{t("peakHours")}</CardTitle>
            <CardDescription>{t("peakHoursHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsHourlyChart hours={hourly} emptyLabel={t("noData")} />
          </CardContent>
        </Card>
      </div>

      <AnalyticsBreakdowns
        articles={topArticles}
        verdicts={verdicts}
        topics={topics}
        referrers={referrers}
        directCount={directCount}
        pages={topPages}
        entryPages={entryPages}
        exitPages={exitPages}
        devices={devices}
        locales={locales}
        verdictLabel={(verdict) => tv(`${verdict}.label`)}
        rubricLabel={(rubric) => trub(`${rubric}.label`)}
        deviceLabel={(device) => t(`deviceTypes.${device}`)}
        formatNumber={formatNumber}
        labels={{
          topArticles: t("topArticles"),
          byVerdict: t("byVerdict"),
          byTopic: t("byTopic"),
          topReferrers: t("topReferrers"),
          direct: t("direct"),
          topPages: t("topPages"),
          entryPages: t("entryPages"),
          exitPages: t("exitPages"),
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
