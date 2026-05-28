import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { VERDICTS, verdictDotClasses } from "@/lib/verdicts";

type FilterTag = { id: string; label: string; slug: string };
type Current = { verdict?: string; tag?: string };

function buildHref({ verdict, tag }: Current): string {
  const params = new URLSearchParams();
  if (verdict) params.set("verdict", verdict);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-secondary text-foreground font-semibold"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );
}

export function FeedFilters({
  tags,
  current,
}: {
  tags: FilterTag[];
  current: Current;
}) {
  const t = useTranslations("feed");
  const tv = useTranslations("verdicts");

  return (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-3.5">
      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={buildHref({ verdict: current.verdict })}
          className={chipClass(!current.tag)}
        >
          {t("all")}
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={buildHref({ verdict: current.verdict, tag: tag.slug })}
            className={chipClass(current.tag === tag.slug)}
          >
            {tag.label}
          </Link>
        ))}
      </div>

      <div className="bg-border h-[18px] w-px" aria-hidden />

      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={buildHref({ tag: current.tag })}
          className={chipClass(!current.verdict)}
        >
          {t("all")}
        </Link>
        {VERDICTS.map((verdict) => (
          <Link
            key={verdict}
            href={buildHref({ verdict, tag: current.tag })}
            className={chipClass(current.verdict === verdict)}
          >
            <span
              className={cn(
                "size-[7px] rounded-full",
                verdictDotClasses[verdict],
              )}
              aria-hidden
            />
            {tv(`${verdict}.label`)}
          </Link>
        ))}
      </div>
    </div>
  );
}
