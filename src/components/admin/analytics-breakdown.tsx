import { Link } from "@/i18n/navigation";

export type BreakdownRow = {
  key: string;
  label: string;
  href?: string;
  value: number;
};

type AnalyticsBreakdownProps = {
  title: string;
  rows: BreakdownRow[];
  emptyLabel: string;
  formatNumber: (value: number) => string;
};

// Top-N list with a share bar behind each row (relative to the busiest row) —
// the standard "top sources / pages" widget.
export function AnalyticsBreakdown({
  title,
  rows,
  emptyLabel,
  formatNumber,
}: AnalyticsBreakdownProps) {
  const max = rows.reduce((peak, row) => Math.max(peak, row.value), 0);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-[0.05em] uppercase">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.key} className="relative flex items-center gap-3">
              <div
                className="bg-primary/10 absolute inset-y-0 left-0 rounded-sm"
                style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
                aria-hidden
              />
              <span className="relative min-w-0 flex-1 truncate px-2 py-1 text-sm">
                {row.href ? (
                  <Link href={row.href} className="hover:text-primary">
                    {row.label}
                  </Link>
                ) : (
                  row.label
                )}
              </span>
              <span className="text-muted-foreground relative px-2 text-sm tabular-nums">
                {formatNumber(row.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
