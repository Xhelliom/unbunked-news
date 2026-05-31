import type { VisitMetrics } from "@/lib/analytics/queries";

import { AnalyticsKpiCard } from "./analytics-kpi-card";

export type KpiLabels = {
  visitors: string;
  pageviews: string;
  viewsPerVisit: string;
  bounceRate: string;
  delta: string;
};

type AnalyticsKpiRowProps = {
  current: VisitMetrics;
  previous: VisitMetrics;
  labels: KpiLabels;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDecimal: (value: number) => string;
};

function deltaPct(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function AnalyticsKpiRow({
  current,
  previous,
  labels,
  formatNumber,
  formatPercent,
  formatDecimal,
}: AnalyticsKpiRowProps) {
  const cards: {
    label: string;
    value: string;
    deltaPct: number | null;
    goodDirection: "up" | "down";
  }[] = [
    {
      label: labels.visitors,
      value: formatNumber(current.visits),
      deltaPct: deltaPct(current.visits, previous.visits),
      goodDirection: "up",
    },
    {
      label: labels.pageviews,
      value: formatNumber(current.pageviews),
      deltaPct: deltaPct(current.pageviews, previous.pageviews),
      goodDirection: "up",
    },
    {
      label: labels.viewsPerVisit,
      value: formatDecimal(current.viewsPerVisit),
      deltaPct: deltaPct(current.viewsPerVisit, previous.viewsPerVisit),
      goodDirection: "up",
    },
    {
      label: labels.bounceRate,
      value: formatPercent(current.bounceRate),
      deltaPct: deltaPct(current.bounceRate, previous.bounceRate),
      goodDirection: "down",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <AnalyticsKpiCard
          key={card.label}
          label={card.label}
          value={card.value}
          deltaPct={card.deltaPct}
          goodDirection={card.goodDirection}
          deltaLabel={labels.delta}
        />
      ))}
    </div>
  );
}
