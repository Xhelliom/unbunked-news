import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type AnalyticsKpiCardProps = {
  label: string;
  value: string;
  // Percentage change vs the previous period, or null when there's no baseline.
  deltaPct: number | null;
  // For metrics like bounce rate a decrease is the improvement.
  goodDirection?: "up" | "down";
  deltaLabel: string;
};

export function AnalyticsKpiCard({
  label,
  value,
  deltaPct,
  goodDirection = "up",
  deltaLabel,
}: AnalyticsKpiCardProps) {
  const rounded = deltaPct === null ? null : Math.round(deltaPct);
  const isFlat = rounded === null || rounded === 0;
  const isUp = (rounded ?? 0) > 0;
  const isGood = isFlat ? false : isUp === (goodDirection === "up");
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  return (
    <Card>
      <CardContent className="space-y-1.5">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            isFlat
              ? "text-muted-foreground"
              : isGood
                ? "text-verdict-reliable"
                : "text-verdict-debunked",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {rounded === null ? "—" : `${isUp ? "+" : ""}${rounded}%`}
          <span className="text-muted-foreground font-normal">
            {deltaLabel}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
