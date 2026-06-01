import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { CONDITIONAL_CRITERIA, CORE_CRITERIA } from "@/lib/score-criteria";
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
          {t("scoreTitle")}
        </h2>
        <p className="text-muted-foreground mt-3 leading-[1.6]">
          {t("scoreBody")}
        </p>

        <h3 className="mt-8 text-sm font-semibold tracking-[0.05em] uppercase">
          {t("coreTitle")}
        </h3>
        <dl className="mt-4 space-y-4">
          {CORE_CRITERIA.map((criterion) => (
            <div key={criterion}>
              <dt className="font-semibold">{tc(`${criterion}.label`)}</dt>
              <dd className="text-muted-foreground mt-0.5 leading-[1.55]">
                {tc(`${criterion}.description`)}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-sm font-semibold tracking-[0.05em] uppercase">
          {t("optionalTitle")}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{t("optionalHint")}</p>
        <dl className="mt-4 space-y-4">
          {CONDITIONAL_CRITERIA.map((criterion) => (
            <div key={criterion}>
              <dt className="font-semibold">{tc(`${criterion}.label`)}</dt>
              <dd className="text-muted-foreground mt-0.5 leading-[1.55]">
                {tc(`${criterion}.description`)}
              </dd>
            </div>
          ))}
        </dl>
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
