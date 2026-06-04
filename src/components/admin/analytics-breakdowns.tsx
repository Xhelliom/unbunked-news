import type { DeviceType } from "@/lib/analytics/constants";
import type {
  ArticleViews,
  DeviceCount,
  LocaleCount,
  PathCount,
  ReferrerCount,
  RubricCount,
  VerdictCount,
} from "@/lib/analytics/queries";
import type { Rubric } from "@/lib/rubrics";
import type { Verdict } from "@/lib/verdicts";

import { AnalyticsBreakdown, type BreakdownRow } from "./analytics-breakdown";

export type BreakdownLabels = {
  topArticles: string;
  byVerdict: string;
  byTopic: string;
  topReferrers: string;
  direct: string;
  topPages: string;
  entryPages: string;
  exitPages: string;
  devices: string;
  languages: string;
  noData: string;
  noReferrers: string;
};

type AnalyticsBreakdownsProps = {
  articles: ArticleViews[];
  verdicts: VerdictCount[];
  topics: RubricCount[];
  referrers: ReferrerCount[];
  directCount: number;
  pages: PathCount[];
  entryPages: PathCount[];
  exitPages: PathCount[];
  devices: DeviceCount[];
  locales: LocaleCount[];
  labels: BreakdownLabels;
  verdictLabel: (verdict: Verdict) => string;
  rubricLabel: (rubric: Rubric) => string;
  deviceLabel: (device: DeviceType) => string;
  formatNumber: (value: number) => string;
};

const pathRows = (pages: PathCount[]): BreakdownRow[] =>
  pages.map((page) => ({ key: page.path, label: page.path, value: page.views }));

export function AnalyticsBreakdowns({
  articles,
  verdicts,
  topics,
  referrers,
  directCount,
  pages,
  entryPages,
  exitPages,
  devices,
  locales,
  labels,
  verdictLabel,
  rubricLabel,
  deviceLabel,
  formatNumber,
}: AnalyticsBreakdownsProps) {
  const sections: {
    key: string;
    title: string;
    rows: BreakdownRow[];
    emptyLabel: string;
  }[] = [
    {
      key: "articles",
      title: labels.topArticles,
      emptyLabel: labels.noData,
      rows: articles.map((article) => ({
        key: article.id,
        label: article.title,
        href: `/article/${article.slug}`,
        value: article.views,
      })),
    },
    {
      key: "verdicts",
      title: labels.byVerdict,
      emptyLabel: labels.noData,
      rows: verdicts.map((entry) => ({
        key: entry.verdict,
        label: verdictLabel(entry.verdict),
        value: entry.views,
      })),
    },
    {
      key: "topics",
      title: labels.byTopic,
      emptyLabel: labels.noData,
      rows: topics.map((topic) => ({
        key: topic.rubric,
        label: rubricLabel(topic.rubric),
        value: topic.views,
      })),
    },
    {
      key: "sources",
      title: labels.topReferrers,
      emptyLabel: labels.noReferrers,
      rows: [
        ...(directCount > 0
          ? [{ key: "direct", label: labels.direct, value: directCount }]
          : []),
        ...referrers.map((referrer) => ({
          key: referrer.host,
          label: referrer.host,
          value: referrer.views,
        })),
      ],
    },
    {
      key: "pages",
      title: labels.topPages,
      emptyLabel: labels.noData,
      rows: pathRows(pages),
    },
    {
      key: "entry",
      title: labels.entryPages,
      emptyLabel: labels.noData,
      rows: pathRows(entryPages),
    },
    {
      key: "exit",
      title: labels.exitPages,
      emptyLabel: labels.noData,
      rows: pathRows(exitPages),
    },
    {
      key: "devices",
      title: labels.devices,
      emptyLabel: labels.noData,
      rows: devices.map((device) => ({
        key: device.deviceType,
        label: deviceLabel(device.deviceType),
        value: device.views,
      })),
    },
    {
      key: "languages",
      title: labels.languages,
      emptyLabel: labels.noData,
      rows: locales.map((entry) => ({
        key: entry.locale,
        label: entry.locale.toUpperCase(),
        value: entry.views,
      })),
    },
  ];

  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {sections.map((section) => (
        <AnalyticsBreakdown
          key={section.key}
          title={section.title}
          rows={section.rows}
          emptyLabel={section.emptyLabel}
          formatNumber={formatNumber}
        />
      ))}
    </div>
  );
}
