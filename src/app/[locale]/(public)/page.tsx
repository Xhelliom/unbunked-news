import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getAllTags, getPublishedArticles } from "@/lib/articles";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { ArticleCard } from "@/components/article-card";
import { FeedFilters } from "@/components/feed-filters";

function asVerdict(value: string | undefined): Verdict | undefined {
  return value && (VERDICTS as readonly string[]).includes(value)
    ? (value as Verdict)
    : undefined;
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ verdict?: string; tag?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { verdict: verdictParam, tag } = await searchParams;
  const verdict = asVerdict(verdictParam);

  const [items, tags] = await Promise.all([
    getPublishedArticles({ verdict, tag }),
    getAllTags(),
  ]);
  const t = await getTranslations("feed");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <FeedFilters tags={tags} current={{ verdict, tag }} />

      {items.length === 0 ? (
        <p className="text-muted-foreground py-24 text-center">{t("empty")}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
