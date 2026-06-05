import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import {
  CONDITIONAL_CRITERIA,
  CORE_CRITERIA,
  CRITERION_WEIGHT,
  isConditionalCriterion,
  type ScoreCriterion,
} from "@/lib/score-criteria";
import { VERDICTS } from "@/lib/verdicts";
import { VerdictBadge } from "@/components/verdict-badge";

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("methodology");
  const tc = await getTranslations("criteria");
  const tv = await getTranslations("verdicts");

  const PRINCIPLES = ["evidence", "rigor", "doubt"] as const;

  const renderCriterion = (criterion: ScoreCriterion) => {
    const weight = CRITERION_WEIGHT[criterion];
    const weightLabel = isConditionalCriterion(criterion)
      ? t("weightLabelConditional", { weight })
      : t("weightLabel", { weight });
    return (
      <div key={criterion} className="rounded-xl border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="font-serif text-lg font-bold tracking-tight">
            {tc(`${criterion}.label`)}
          </h4>
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
            {weightLabel}
          </span>
        </div>
        <p className="mt-2 leading-[1.55]">{tc(`${criterion}.description`)}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-foreground/70 font-semibold tracking-[0.04em] uppercase">
              {t("whyLabel")}
            </dt>
            <dd className="text-muted-foreground mt-1 leading-[1.55]">
              {tc(`${criterion}.why`)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/70 font-semibold tracking-[0.04em] uppercase">
              {t("howLabel")}
            </dt>
            <dd className="text-muted-foreground mt-1 leading-[1.55]">
              {tc(`${criterion}.how`)}
            </dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <article className="mx-auto max-w-[760px] px-4 pt-10 pb-20 sm:px-6">
      <h1 className="font-serif text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-4 text-lg leading-[1.55]">
        {t("intro")}
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          {t("principlesTitle")}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div key={principle} className="bg-muted/40 rounded-xl p-5">
              <dt className="font-semibold">
                {t(`principles.${principle}.title`)}
              </dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-[1.55]">
                {t(`principles.${principle}.body`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          {t("scoreTitle")}
        </h2>
        <p className="text-muted-foreground mt-3 leading-[1.6]">
          {t("scoreBody")}
        </p>

        <h3 className="mt-8 text-sm font-semibold tracking-[0.05em] uppercase">
          {t("coreTitle")}
        </h3>
        <div className="mt-4 space-y-4">
          {CORE_CRITERIA.map(renderCriterion)}
        </div>

        <h3 className="mt-8 text-sm font-semibold tracking-[0.05em] uppercase">
          {t("optionalTitle")}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{t("optionalHint")}</p>
        <div className="mt-4 space-y-4">
          {CONDITIONAL_CRITERIA.map(renderCriterion)}
        </div>
      </section>

      <section className="mt-12 border-t pt-10">
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          {tv("title")}
        </h2>
        <p className="text-muted-foreground mt-3 leading-[1.6]">
          {tv("subtitle")}
        </p>
        <dl className="mt-6 space-y-4">
          {VERDICTS.map((verdict) => (
            <div
              key={verdict}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <dt className="sm:w-40 sm:shrink-0">
                <VerdictBadge verdict={verdict} />
              </dt>
              <dd className="text-muted-foreground leading-[1.55]">
                {tv(`${verdict}.description`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
