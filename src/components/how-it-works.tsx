import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { VERDICT_BAND } from "@/lib/score-criteria";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { VerdictBadge } from "@/components/verdict-badge";

const STEPS = ["extract", "evidence", "score"] as const;

// Compact explainer on the home page: the three pipeline steps and the verdict
// scale, with a link to the full methodology. Sits below the hero so the latest
// stories stay first, but above the feed so a first-time reader meets the
// method without scrolling to the footer.
export function HowItWorks() {
  const t = useTranslations("howItWorks");
  const tv = useTranslations("verdicts");

  const band = (verdict: Verdict) => {
    const range = VERDICT_BAND[verdict];
    return range
      ? tv("bandLabel", { min: range[0], max: range[1] })
      : tv("bandNone");
  };

  return (
    <section className="bg-muted/30 mt-12 rounded-2xl border p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <Link
          href="/methode"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          {t("link")}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step, index) => (
          <li key={step}>
            <p className="flex items-baseline gap-2 text-sm font-semibold">
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {index + 1}
              </span>
              {t(`steps.${step}.title`)}
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-[1.55]">
              {t(`steps.${step}.body`)}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t pt-5">
        <p className="text-foreground/70 text-xs font-semibold tracking-[0.05em] uppercase">
          {t("scaleTitle")}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-3">
          {VERDICTS.map((verdict) => (
            <li key={verdict}>
              <VerdictBadge verdict={verdict} />
              <span className="text-muted-foreground mt-1 block text-xs font-medium tabular-nums">
                {band(verdict)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
