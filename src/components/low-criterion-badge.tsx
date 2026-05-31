import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  lowestWeakCriterion,
  type CriterionScores,
} from "@/lib/score-criteria";

// Compact warning shown on feed cards when one of the article's sub-scores
// falls below the alert threshold (e.g. "Neutralité faible"). Renders nothing
// when every criterion is healthy or absent.
export function LowCriterionBadge({
  scores,
  className,
}: {
  scores: CriterionScores;
  className?: string;
}) {
  const t = useTranslations("criteria");
  const criterion = lowestWeakCriterion(scores);
  if (!criterion) return null;

  return (
    <span
      className={cn(
        "bg-verdict-debunked-bg text-verdict-debunked-fg ring-verdict-debunked/30 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        className,
      )}
    >
      <TriangleAlert className="size-3" />
      {t("lowWarning", { criterion: t(`${criterion}.label`) })}
    </span>
  );
}
