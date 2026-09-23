import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { Rubric } from "@/lib/rubrics";

// The one metadata line every feed card carries, in the same place and the same
// order: the outlet, then the section. The outlet stays in small caps because
// it is what a reader recognises; the section drops to sentence case so it
// stops competing with the headline. The hero adds a "featured" marker in front
// and nothing else, so the three card sizes read as one system.
export function CardMeta({
  sourceName,
  rubric,
  isFeatured = false,
  className,
}: {
  sourceName: string;
  rubric: Rubric | null;
  isFeatured?: boolean;
  className?: string;
}) {
  const t = useTranslations("rubrics");
  const tFeed = useTranslations("feed");

  return (
    <p
      className={cn(
        "text-muted-foreground flex flex-wrap items-baseline gap-x-1.5 text-xs",
        className,
      )}
    >
      {isFeatured && (
        <>
          <span className="text-primary font-bold tracking-[0.08em] uppercase">
            {tFeed("featured")}
          </span>
          <span aria-hidden>·</span>
        </>
      )}
      <span className="font-semibold tracking-[0.05em] uppercase">
        {sourceName}
      </span>
      {rubric && (
        <>
          <span aria-hidden>·</span>
          <span>{t(`${rubric}.label`)}</span>
        </>
      )}
    </p>
  );
}
