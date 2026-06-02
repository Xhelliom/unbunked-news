import { getTranslations } from "next-intl/server";

import type { getSuggestedArticles } from "@/lib/suggestions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/article-card";

type SuggestedArticles = Awaited<ReturnType<typeof getSuggestedArticles>>;

export async function ArticleSuggestions({
  articles,
}: {
  articles: SuggestedArticles;
}) {
  const t = await getTranslations("article.suggestions");

  if (articles.length === 0) {
    return (
      <section className="mt-16 max-w-[760px]">
        <div className="bg-muted/40 rounded-xl border p-6 text-center">
          <h2 className="font-serif text-xl font-bold tracking-tight">
            {t("fallbackTitle")}
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-[1.55]">
            {t("fallbackBody")}
          </p>
          <Button asChild className="mt-5">
            <Link href="/submit">{t("cta")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl font-bold tracking-tight">
        {t("title")}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
