import type { DeviceType } from "@/lib/analytics/constants";
import type {
  ArticleViews,
  DeviceCount,
  LocaleCount,
  PathCount,
  ReferrerCount,
} from "@/lib/analytics/queries";

import { AnalyticsBreakdown } from "./analytics-breakdown";

type AnalyticsBreakdownsProps = {
  articles: ArticleViews[];
  referrers: ReferrerCount[];
  pages: PathCount[];
  entryPages: PathCount[];
  devices: DeviceCount[];
  locales: LocaleCount[];
  labels: {
    topArticles: string;
    topReferrers: string;
    topPages: string;
    entryPages: string;
    devices: string;
    languages: string;
    noData: string;
    noReferrers: string;
  };
  deviceLabel: (type: DeviceType) => string;
  formatNumber: (value: number) => string;
};

export function AnalyticsBreakdowns({
  articles,
  referrers,
  pages,
  entryPages,
  devices,
  locales,
  labels,
  deviceLabel,
  formatNumber,
}: AnalyticsBreakdownsProps) {
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <AnalyticsBreakdown
        title={labels.topArticles}
        rows={articles.map((article) => ({
          key: article.id,
          label: article.title,
          href: `/article/${article.slug}`,
          value: article.views,
        }))}
        emptyLabel={labels.noData}
        formatNumber={formatNumber}
      />
      <AnalyticsBreakdown
        title={labels.topReferrers}
        rows={referrers.map((referrer) => ({
          key: referrer.host,
          label: referrer.host,
          value: referrer.views,
        }))}
        emptyLabel={labels.noReferrers}
        formatNumber={formatNumber}
      />
      <AnalyticsBreakdown
        title={labels.topPages}
        rows={pages.map((page) => ({
          key: page.path,
          label: page.path,
          value: page.views,
        }))}
        emptyLabel={labels.noData}
        formatNumber={formatNumber}
      />
      <AnalyticsBreakdown
        title={labels.entryPages}
        rows={entryPages.map((page) => ({
          key: page.path,
          label: page.path,
          value: page.views,
        }))}
        emptyLabel={labels.noData}
        formatNumber={formatNumber}
      />
      <AnalyticsBreakdown
        title={labels.devices}
        rows={devices.map((device) => ({
          key: device.deviceType,
          label: deviceLabel(device.deviceType),
          value: device.views,
        }))}
        emptyLabel={labels.noData}
        formatNumber={formatNumber}
      />
      <AnalyticsBreakdown
        title={labels.languages}
        rows={locales.map((entry) => ({
          key: entry.locale,
          label: entry.locale.toUpperCase(),
          value: entry.views,
        }))}
        emptyLabel={labels.noData}
        formatNumber={formatNumber}
      />
    </div>
  );
}
