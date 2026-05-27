import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getArticleBySlug } from "@/lib/articles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { VerdictBadge } from "@/components/verdict-badge";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const article = await getArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const t = await getTranslations("article");
  const ts = await getTranslations("claimStatus");
  const format = await getFormatter();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        {article.verdict && <VerdictBadge verdict={article.verdict} />}
        <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          {article.sourceName}
        </span>
        {article.publishedAt && (
          <span className="text-muted-foreground text-sm">
            {t("publishedOn")}{" "}
            {format.dateTime(article.publishedAt, { dateStyle: "long" })}
          </span>
        )}
      </div>

      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {article.title}
      </h1>

      {article.summary && (
        <p className="text-muted-foreground mt-4 text-lg">{article.summary}</p>
      )}

      <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl border">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {article.reliabilityScore !== null && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {article.reliabilityScore}
            </span>
            <span className="text-muted-foreground text-sm">
              / 100 · {t("score")}
            </span>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={article.urlOrigine} target="_blank" rel="noreferrer noopener">
            {t("readOriginal")}
          </a>
        </Button>
      </div>

      {article.articleTags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {article.articleTags.map(({ tag }) => (
            <Badge key={tag.id} variant="secondary">
              {tag.label}
            </Badge>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("claimsTitle")}
        </h2>
        <ul className="mt-4 space-y-4">
          {article.claims.map((claim) => (
            <li key={claim.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{claim.claimText}</p>
                <Badge variant="outline" className="shrink-0">
                  {ts(claim.status)}
                </Badge>
              </div>
              {claim.explanation && (
                <p className="text-muted-foreground mt-2 text-sm">
                  {claim.explanation}
                </p>
              )}
              {claim.sources.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    {t("sources")}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {claim.sources.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary text-sm underline"
                        >
                          {source.title ?? source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
