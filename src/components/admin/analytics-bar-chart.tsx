import type { DailyPoint } from "@/lib/analytics/queries";

type AnalyticsBarChartProps = {
  data: DailyPoint[];
  pageviewsLabel: string;
  visitorsLabel: string;
  emptyLabel: string;
  formatDay: (iso: string) => string;
};

// Lightweight CSS-only chart, no charting dependency. Each day is an outer bar
// (pageviews) with an inner bar (visitors, always <= pageviews) layered on top.
export function AnalyticsBarChart({
  data,
  pageviewsLabel,
  visitorsLabel,
  emptyLabel,
  formatDay,
}: AnalyticsBarChartProps) {
  const max = data.reduce((peak, point) => Math.max(peak, point.pageviews), 0);

  if (max === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  const height = (value: number) => `${Math.max((value / max) * 100, value > 0 ? 2 : 0)}%`;

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary/30 size-2.5 rounded-sm" aria-hidden />
          {pageviewsLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary size-2.5 rounded-sm" aria-hidden />
          {visitorsLabel}
        </span>
      </div>
      <div
        className="flex h-48 items-end gap-1"
        role="img"
        aria-label={`${pageviewsLabel} / ${visitorsLabel}`}
      >
        {data.map((point) => (
          <div
            key={point.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${formatDay(point.day)} · ${point.pageviews} / ${point.visitors}`}
          >
            <div
              className="bg-primary/20 group-hover:bg-primary/30 relative w-full rounded-t-sm transition-colors"
              style={{ height: height(point.pageviews) }}
            >
              <div
                className="bg-primary absolute inset-x-0 bottom-0 rounded-t-sm"
                style={{
                  height: `${(point.visitors / Math.max(point.pageviews, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
