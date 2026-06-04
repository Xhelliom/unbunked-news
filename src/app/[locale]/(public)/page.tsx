import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getPublishedArticles } from "@/lib/articles";
import { isRubric, RUBRICS, type Rubric } from "@/lib/rubrics";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/article-card";
import { HeroCard } from "@/components/hero-card";
import { SecondaryCard } from "@/components/secondary-card";
import { FeedFilters } from "@/components/feed-filters";

function asVerdict(value: string | undefined): Verdict | undefined {
  return value && (VERDICTS as readonly string[]).includes(value)
    ? (value as Verdict)
    : undefined;
}

function asRubric(value: string | undefined): Rubric | undefined {
  return isRubric(value) ? value : undefined;
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verdict?: string; rubric?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { verdict: verdictParam, rubric: rubricParam } = await searchParams;
  const verdict = asVerdict(verdictParam);
  const rubric = asRubric(rubricParam);

  const t = await getTranslations("feed");
  const tv = await getTranslations("verdicts");
  const trub = await getTranslations("rubrics");

  const hasFilter = Boolean(verdict || rubric);

  // The editorial layout (hero + two secondaries) always reflects the latest
  // stories, independent of the filters — those only narrow the grid below.
  const recent = await getPublishedArticles({});
  const showHero = recent.length >= 3;
  const hero = showHero ? recent[0] : null;
  const stack = showHero ? recent.slice(1, 3) : [];
  const heroIds = new Set(
    showHero ? recent.slice(0, 3).map((article) => article.id) : [],
  );

  // The grid honours the active filter; reuse the recent list when nothing is
  // filtered to avoid a second identical query. Either way, the hero stories
  // are dropped so they never appear twice.
  const filtered = hasFilter
    ? await getPublishedArticles({ verdict, rubric })
    : recent;
  const grid = filtered.filter((article) => !heroIds.has(article.id));

  const sectionTitle = verdict
    ? tv(`${verdict}.label`)
    : rubric
      ? trub(`${rubric}.label`)
      : t("allArticles");

  // Only show the bare empty state when there is genuinely nothing to browse.
  // When a filter is active but matches nothing, we still render the browse bar
  // so the reader can clear it.
  if (recent.length === 0 && !hasFilter) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
        <p className="text-muted-foreground py-24 text-center">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
      {hero && (
        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <HeroCard article={hero} />
          <div className="flex flex-col gap-3.5">
            {stack.map((article) => (
              <SecondaryCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      <section className={cn(hero ? "mt-14" : "mt-0")}>
        <header className="mb-6 flex flex-wrap items-center gap-6 border-b pb-3.5">
          <h2 className="font-serif text-[22px] font-bold tracking-tight whitespace-nowrap">
            {sectionTitle}
          </h2>
          <FeedFilters rubrics={[...RUBRICS]} current={{ verdict, rubric }} />
        </header>

        {grid.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-16 text-center">{t("empty")}</p>
        )}
      </section>
    </div>
  );
}
