import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { VERDICTS } from "@/lib/verdicts";

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
    "rounded-full border px-3 py-1 text-sm transition-colors",
    active
      ? "bg-primary text-primary-foreground border-transparent"
      : "text-muted-foreground hover:text-foreground hover:border-foreground/30",
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs font-semibold tracking-wide uppercase">
          {t("verdictFilter")}
        </span>
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
            {tv(`${verdict}.label`)}
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-16 text-xs font-semibold tracking-wide uppercase">
            {t("tagFilter")}
          </span>
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
      )}
    </div>
  );
}
