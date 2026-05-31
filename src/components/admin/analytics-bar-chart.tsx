import type { DailyViews } from "@/lib/analytics/queries";

type AnalyticsBarChartProps = {
  data: DailyViews[];
  emptyLabel: string;
  formatDay: (iso: string) => string;
};

// Lightweight CSS-only bar chart — no charting dependency. Bars scale to the
// busiest day in the range.
export function AnalyticsBarChart({
  data,
  emptyLabel,
  formatDay,
}: AnalyticsBarChartProps) {
  const max = data.reduce((peak, point) => Math.max(peak, point.views), 0);

  if (max === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex h-48 items-end gap-1" role="img">
      {data.map((point) => (
        <div
          key={point.day}
          className="group flex h-full flex-1 flex-col items-center justify-end"
          title={`${formatDay(point.day)} · ${point.views}`}
        >
          <div
            className="bg-primary/80 group-hover:bg-primary w-full rounded-t-sm transition-colors"
            style={{ height: `${Math.max((point.views / max) * 100, 2)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
