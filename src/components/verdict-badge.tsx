import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  type Verdict,
  verdictBadgeClasses,
  verdictDotClasses,
} from "@/lib/verdicts";

type VerdictBadgeProps = {
  verdict: Verdict;
  className?: string;
};

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const t = useTranslations("verdicts");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        verdictBadgeClasses[verdict],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", verdictDotClasses[verdict])}
        aria-hidden
      />
      {t(`${verdict}.label`)}
    </span>
  );
}
