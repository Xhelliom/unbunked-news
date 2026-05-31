import { getFormatter, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RETENTION_DAYS,
  parseRange,
} from "@/lib/analytics/constants";
import {
  loadDailyViews,
  loadOldestEventDate,
  loadTopArticles,
  loadTopPages,
  loadTopReferrers,
  loadTotals,
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

import { purgeOldEvents } from "./actions";

type RankingRow = { key: string; label: string; href?: string; views: number };

function RankingList({
  rows,
  emptyLabel,
  formatNumber,
}: {
  rows: RankingRow[];
  emptyLabel: string;
  formatNumber: (value: number) => string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-border divide-y text-sm">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 py-2">
          <span className="min-w-0 flex-1 truncate">
            {row.href ? (
              <Link href={row.href} className="hover:text-primary">
                {row.label}
              </Link>
            ) : (
              row.label
            )}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatNumber(row.views)}
          </span>
        </li>
      ))}
    </ul>
  );
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

  const [totals, daily, topPages, topArticles, topReferrers, oldest] =
    await Promise.all([
      loadTotals(days),
      loadDailyViews(days),
      loadTopPages(days),
      loadTopArticles(days),
      loadTopReferrers(days),
      loadOldestEventDate(),
    ]);

  const formatNumber = (value: number) => format.number(value);
  const formatDay = (iso: string) =>
    format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  const summary = [
    { key: "visitors", value: totals.visitors },
    { key: "pageviews", value: totals.pageviews },
    { key: "articleViews", value: totals.articleViews },
  ] as const;

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

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <CardDescription>{t(`summary.${card.key}`)}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {formatNumber(card.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsBarChart
            data={daily}
            emptyLabel={t("noData")}
            formatDay={formatDay}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topArticles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankingList
              rows={topArticles.map((article) => ({
                key: article.id,
                label: article.title,
                href: `/article/${article.slug}`,
                views: article.views,
              }))}
              emptyLabel={t("noData")}
              formatNumber={formatNumber}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topPages")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankingList
              rows={topPages.map((page) => ({
                key: page.path,
                label: page.path,
                views: page.views,
              }))}
              emptyLabel={t("noData")}
              formatNumber={formatNumber}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topReferrers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankingList
              rows={topReferrers.map((referrer) => ({
                key: referrer.host,
                label: referrer.host,
                views: referrer.views,
              }))}
              emptyLabel={t("noReferrers")}
              formatNumber={formatNumber}
            />
          </CardContent>
        </Card>
      </div>

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
