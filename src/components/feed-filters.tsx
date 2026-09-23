"use client";

import { Check, ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Rubric } from "@/lib/rubrics";
import { VERDICTS, verdictDotClasses, type Verdict } from "@/lib/verdicts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Current = { verdict?: Verdict; rubric?: Rubric };

function buildHref({ verdict, rubric }: Current): string {
  const params = new URLSearchParams();
  if (verdict) params.set("verdict", verdict);
  if (rubric) params.set("rubric", rubric);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

// One row of the filter menu: a link that navigates by search param, with the
// tick on the left so the labels stay aligned whether or not they are active.
function FilterRow({
  href,
  label,
  isActive,
  dotClass,
}: {
  href: string;
  label: string;
  isActive: boolean;
  dotClass?: string;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link href={href} className="gap-2">
        <Check className={cn("size-3.5", !isActive && "opacity-0")} />
        {dotClass && (
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
          />
        )}
        <span className={cn(isActive && "font-semibold")}>{label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

// Both feed axes behind one control. Spelled out as two rows of bare words,
// they read as a legend rather than as something you can click; a button that
// names what is currently applied says it is a control and says what it is set
// to. The rows stay links so a filtered feed keeps its own URL.
export function FeedFilters({
  rubrics,
  current,
}: {
  rubrics: Rubric[];
  current: Current;
}) {
  const t = useTranslations("feed");
  const tv = useTranslations("verdicts");
  const tr = useTranslations("rubrics");

  const active = [
    current.verdict && tv(`${current.verdict}.label`),
    current.rubric && tr(`${current.rubric}.label`),
  ].filter(Boolean);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="sm:ml-auto">
          <ListFilter className="size-3.5" />
          {active.length > 0 ? active.join(" · ") : t("filter")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("verdictFilter")}</DropdownMenuLabel>
        <FilterRow
          href={buildHref({ rubric: current.rubric })}
          label={t("all")}
          isActive={!current.verdict}
        />
        {VERDICTS.map((verdict) => (
          <FilterRow
            key={verdict}
            href={buildHref({ verdict, rubric: current.rubric })}
            label={tv(`${verdict}.label`)}
            isActive={current.verdict === verdict}
            dotClass={verdictDotClasses[verdict]}
          />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("rubricFilter")}</DropdownMenuLabel>
        <FilterRow
          href={buildHref({ verdict: current.verdict })}
          label={t("all")}
          isActive={!current.rubric}
        />
        {rubrics.map((rubric) => (
          <FilterRow
            key={rubric}
            href={buildHref({ verdict: current.verdict, rubric })}
            label={tr(`${rubric}.label`)}
            isActive={current.rubric === rubric}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
