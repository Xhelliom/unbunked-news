import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { verdictDotClasses, type Verdict } from "@/lib/verdicts";

// Verdict and score laid over a feed card's image. Both sit on the same row, in
// the same pill and at the same size: the coloured label alone was unreadable
// against a light photo, and the score belongs next to the word it explains.
const PILL =
  "bg-background/90 ring-border inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset backdrop-blur";

export function FeedImageOverlay({
  verdict,
  score,
  className,
}: {
  verdict: Verdict | null;
  score: number | null;
  className?: string;
}) {
  const t = useTranslations("verdicts");

  if (!verdict && score === null) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3",
        className,
      )}
    >
      {verdict && (
        <span className={cn(PILL, "gap-1.5 tracking-[0.06em] uppercase")}>
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              verdictDotClasses[verdict],
            )}
          />
          {t(`${verdict}.label`)}
        </span>
      )}
      {score !== null && (
        <span className={cn(PILL, "ml-auto gap-0.5 tabular-nums")}>
          {score}
          <span className="text-muted-foreground font-normal">/100</span>
        </span>
      )}
    </div>
  );
}
