"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { ActivityPoint } from "@/lib/admin/dashboard-queries";
import { cn } from "@/lib/utils";

const DAYS_PER_WEEK = 7;
// Intensity buckets from empty to busiest, mapped onto the primary colour.
const INTENSITY_CLASSES = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;
const MAX_INTENSITY = INTENSITY_CLASSES.length - 1;

function intensity(count: number, max: number): number {
  if (count <= 0 || max <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil((count / max) * MAX_INTENSITY));
}

export function PublishingHeatmap({ data }: { data: ActivityPoint[] }) {
  const t = useTranslations("admin.dashboard.heatmap");
  const format = useFormatter();

  const max = data.reduce((peak, point) => Math.max(peak, point.count), 0);

  // Pad the start so the first column begins on a Monday, then chunk into weeks.
  const first = data[0]
    ? new Date(`${data[0].day}T00:00:00Z`).getUTCDay()
    : 0;
  const lead = (first + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const cells: (ActivityPoint | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...data,
  ];
  const weeks: (ActivityPoint | null)[][] = [];
  for (let i = 0; i < cells.length; i += DAYS_PER_WEEK) {
    weeks.push(cells.slice(i, i + DAYS_PER_WEEK));
  }

  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{t("title")}</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {t("total", { count: total })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((point, dayIndex) =>
                point ? (
                  <span
                    key={point.day}
                    className={cn(
                      "size-2.5 rounded-[3px]",
                      INTENSITY_CLASSES[intensity(point.count, max)],
                    )}
                    title={`${format.dateTime(new Date(`${point.day}T00:00:00Z`), {
                      day: "numeric",
                      month: "short",
                    })} · ${t("dayCount", { count: point.count })}`}
                  />
                ) : (
                  <span key={`pad-${dayIndex}`} className="size-2.5" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span>{t("less")}</span>
        {INTENSITY_CLASSES.map((className, index) => (
          <span
            key={index}
            className={cn("size-2.5 rounded-[3px]", className)}
            aria-hidden
          />
        ))}
        <span>{t("more")}</span>
      </div>
    </div>
  );
}
