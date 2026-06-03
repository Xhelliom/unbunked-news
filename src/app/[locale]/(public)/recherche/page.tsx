import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getSearchResults } from "@/lib/search";
import { ArticleCard } from "@/components/article-card";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length > 0 ? await getSearchResults(query) : [];
  const t = await getTranslations("search");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
      <header className="mb-6 border-b pb-3.5">
        <h1 className="font-serif text-[22px] font-bold tracking-tight">
          {query.length > 0 ? t("title", { query }) : t("placeholder")}
        </h1>
      </header>

      {results.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-16 text-center">{t("empty")}</p>
      )}
    </div>
  );
}
