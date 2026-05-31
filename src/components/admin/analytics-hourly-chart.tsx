type AnalyticsHourlyChartProps = {
  hours: number[];
  emptyLabel: string;
};

// 24 compact bars, one per UTC hour-of-day, to surface peak reading hours.
export function AnalyticsHourlyChart({
  hours,
  emptyLabel,
}: AnalyticsHourlyChartProps) {
  const max = hours.reduce((peak, value) => Math.max(peak, value), 0);

  if (max === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex h-28 items-end gap-0.5" role="img">
      {hours.map((value, hour) => (
        <div
          key={hour}
          className="bg-primary/70 hover:bg-primary flex-1 rounded-t-sm transition-colors"
          style={{ height: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%` }}
          title={`${String(hour).padStart(2, "0")}h · ${value}`}
        />
      ))}
    </div>
  );
}
