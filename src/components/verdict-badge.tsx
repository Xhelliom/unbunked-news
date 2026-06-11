import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  type Verdict,
  verdictDotClasses,
  verdictTextClasses,
} from "@/lib/verdicts";

type VerdictBadgeProps = {
  verdict: Verdict;
  className?: string;
};

// Verdict label as plain text underlined by a bar in the verdict colour — an
// echo of the brand wordmark's spectrum underline. The colour carries the
// meaning; the text keeps the surrounding size and weight, no pill.
export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const t = useTranslations("verdicts");

  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "text-xs font-semibold tracking-wide uppercase",
          verdictTextClasses[verdict],
        )}
      >
        {t(`${verdict}.label`)}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-[0.3em] h-[0.16em] rounded-full",
          verdictDotClasses[verdict],
        )}
      />
    </span>
  );
}
