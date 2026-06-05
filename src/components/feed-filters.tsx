import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Rubric } from "@/lib/rubrics";
import { VERDICTS, verdictDotClasses, type Verdict } from "@/lib/verdicts";

type Current = { verdict?: string; rubric?: string };

// Neutral bar for the verdict-agnostic "Tout" entry — mirrors the muted grey
// of the unverifiable verdict without claiming it.
const RESET_BAR = "bg-muted-foreground";
// The rubric row borrows the brand indigo (the "Un" of the wordmark) so it
// reads as a different axis than the verdict spectrum.
const RUBRIC_BAR = "bg-primary";

// Soft coloured halo dropped below the bar on hover. Authored as literal
// classes (Tailwind only emits classes it sees in source) keyed to the same
// design tokens the bars use.
const VERDICT_GLOW: Record<Verdict, string> = {
  reliable: "group-hover:shadow-[0_3px_12px_1px_var(--verdict-reliable)]",
  nuanced: "group-hover:shadow-[0_3px_12px_1px_var(--verdict-nuanced)]",
  fragile: "group-hover:shadow-[0_3px_12px_1px_var(--verdict-fragile)]",
  debunked: "group-hover:shadow-[0_3px_12px_1px_var(--verdict-debunked)]",
  unverifiable:
    "group-hover:shadow-[0_3px_12px_1px_var(--verdict-unverifiable)]",
};
const RESET_GLOW = "group-hover:shadow-[0_3px_12px_1px_var(--muted-foreground)]";
const RUBRIC_GLOW = "group-hover:shadow-[0_3px_12px_1px_var(--primary)]";

function buildHref({ verdict, rubric }: Current): string {
  const params = new URLSearchParams();
  if (verdict) params.set("verdict", verdict);
  if (rubric) params.set("rubric", rubric);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

// How the bar under a filter renders:
//  - "solid": full colour (active filter, or the whole verdict spectrum while
//    no verdict is selected — that's the logo look).
//  - "dimmed": its colour, faded — a non-selected verdict once one is picked.
//  - "hidden": no bar until active (rubrics).
type BarState = "solid" | "dimmed" | "hidden";

// One filter, styled as a label sitting on a thick rounded bar — the same
// motif as the logo's verdict spectrum.
function FilterTab({
  href,
  label,
  active,
  barClass,
  barState,
  glowClass,
  labelStrong,
}: {
  href: string;
  label: string;
  active: boolean;
  barClass: string;
  barState: BarState;
  glowClass: string;
  // When true, the non-active label keeps full-strength text (the unfiltered
  // verdict spectrum) instead of fading to muted.
  labelStrong: boolean;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "text-xs whitespace-nowrap transition-colors",
          active
            ? "text-foreground font-semibold"
            : labelStrong
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
      <span
        aria-hidden
        className={cn(
          "h-[3px] w-full rounded-full transition-[opacity,box-shadow]",
          barState === "hidden"
            ? "bg-transparent group-hover:bg-border"
            : barState === "dimmed"
              ? cn(barClass, glowClass, "opacity-40 group-hover:opacity-70")
              : cn(barClass, glowClass),
        )}
      />
    </Link>
  );
}

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

  return (
    <div className="flex flex-1 flex-col gap-3 sm:items-end">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 sm:justify-end">
        <FilterTab
          href={buildHref({ rubric: current.rubric })}
          label={t("all")}
          active={!current.verdict}
          barClass={RESET_BAR}
          barState={current.verdict ? "dimmed" : "solid"}
          glowClass={RESET_GLOW}
          labelStrong={!current.verdict}
        />
        {VERDICTS.map((verdict) => (
          <FilterTab
            key={verdict}
            href={buildHref({ verdict, rubric: current.rubric })}
            label={tv(`${verdict}.label`)}
            active={current.verdict === verdict}
            barClass={verdictDotClasses[verdict]}
            barState={
              current.verdict && current.verdict !== verdict
                ? "dimmed"
                : "solid"
            }
            glowClass={VERDICT_GLOW[verdict]}
            labelStrong={!current.verdict}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 sm:justify-end">
        <FilterTab
          href={buildHref({ verdict: current.verdict })}
          label={t("all")}
          active={!current.rubric}
          barClass={RUBRIC_BAR}
          barState={!current.rubric ? "solid" : "hidden"}
          glowClass={RUBRIC_GLOW}
          labelStrong={false}
        />
        {rubrics.map((rubric) => (
          <FilterTab
            key={rubric}
            href={buildHref({ verdict: current.verdict, rubric })}
            label={tr(`${rubric}.label`)}
            active={current.rubric === rubric}
            barClass={RUBRIC_BAR}
            barState={current.rubric === rubric ? "solid" : "hidden"}
            glowClass={RUBRIC_GLOW}
            labelStrong={false}
          />
        ))}
      </div>
    </div>
  );
}
