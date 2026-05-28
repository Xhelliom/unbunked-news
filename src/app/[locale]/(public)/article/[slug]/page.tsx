import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getArticleBySlug } from "@/lib/articles";
import { anchorClaims } from "@/lib/anchor";
import { cn } from "@/lib/utils";
import {
  CLAIM_STATUSES,
  claimStatusBorderClasses,
} from "@/lib/claim-status";
import { verdictDotClasses } from "@/lib/verdicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { VerdictBadge } from "@/components/verdict-badge";

type ArticleDetail = NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>;
type ArticleClaim = ArticleDetail["claims"][number];

function ClaimCard({
  claim,
  sourcesLabel,
}: {
  claim: ArticleClaim;
  sourcesLabel: string;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <ClaimStatusBadge status={claim.status} />
      <p className="mt-2 text-sm font-medium">{claim.claimText}</p>
      {claim.explanation && (
        <p className="text-muted-foreground mt-1.5 text-sm">
          {claim.explanation}
        </p>
      )}
      {claim.sources.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold tracking-wide uppercase">
            {sourcesLabel}
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
    </div>
  );
}

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
  const format = await getFormatter();

  const { paragraphs, orphans } = anchorClaims(article.content, article.claims);
  const hasBody = paragraphs.length > 0;

  const statusCounts = CLAIM_STATUSES.map((status) => ({
    status,
    count: article.claims.filter((claim) => claim.status === status).length,
  })).filter(({ count }) => count > 0);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
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

        {article.originalTitle && article.originalTitle !== article.title && (
          <p className="text-muted-foreground mt-3 text-sm">
            <span className="font-medium">{t("originalTitle")}</span> —{" "}
            <span className="italic">«&nbsp;{article.originalTitle}&nbsp;»</span>
          </p>
        )}

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

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
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
              <a
                href={article.urlOrigine}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("readOriginal")}
              </a>
            </Button>
          </div>
          {article.reliabilityScore !== null && article.verdict && (
            <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  verdictDotClasses[article.verdict],
                )}
                style={{ width: `${article.reliabilityScore}%` }}
              />
            </div>
          )}
        </div>

        {statusCounts.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {statusCounts.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <ClaimStatusBadge status={status} />
                <span className="text-muted-foreground text-sm">×{count}</span>
              </span>
            ))}
          </div>
        )}

        {article.articleTags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {article.articleTags.map(({ tag }) => (
              <Badge key={tag.id} variant="secondary">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {hasBody && (
        <section className="mt-12">
          <h2 className="mx-auto max-w-3xl font-serif text-xl font-bold tracking-tight">
            {t("readingTitle")}
          </h2>
          <div className="mt-6 space-y-6">
            {paragraphs.map((paragraph, index) => (
              <div
                key={index}
                className="lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-8"
              >
                <p
                  className={cn(
                    "font-serif text-lg leading-relaxed",
                    paragraph.claims.length > 0 &&
                      cn(
                        "border-l-4 pl-4",
                        claimStatusBorderClasses[paragraph.claims[0].status],
                      ),
                  )}
                >
                  {paragraph.text}
                </p>
                {paragraph.claims.length > 0 && (
                  <aside className="mt-3 space-y-3 lg:mt-0">
                    {paragraph.claims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        sourcesLabel={t("sources")}
                      />
                    ))}
                  </aside>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {orphans.length > 0 && (
        <section className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-serif text-xl font-bold tracking-tight">
            {hasBody ? t("otherChecks") : t("claimsTitle")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {orphans.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                sourcesLabel={t("sources")}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
