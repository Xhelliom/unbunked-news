import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getArticleBySlug } from "@/lib/articles";
import { buildReadingModel } from "@/lib/reading";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/claim-status";
import { verdictDotClasses } from "@/lib/verdicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { ArticleReader } from "@/components/article-reader";

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
  const tStatus = await getTranslations("claimStatus");
  const format = await getFormatter();

  const { paragraphs, claims: locatedClaims, orphans } = buildReadingModel(
    article.content,
    article.claims,
  );
  const hasBody = paragraphs.length > 0;

  const statusCounts = CLAIM_STATUSES.map((status) => ({
    status,
    count: article.claims.filter((claim) => claim.status === status).length,
  })).filter(({ count }) => count > 0);

  const toCardData = (claim: (typeof article.claims)[number]): ClaimCardData => ({
    status: claim.status,
    claimText: claim.claimText,
    explanation: claim.explanation,
    sources: claim.sources.map((source) => ({
      id: source.id,
      url: source.url,
      title: source.title,
    })),
  });

  // Flat list of located claims for the reading view; segments reference these
  // by index.
  const readerClaims = locatedClaims.map(toCardData);

  const statusLabels = Object.fromEntries(
    CLAIM_STATUSES.map((status) => [status, tStatus(status)]),
  ) as Record<ClaimStatus, string>;

  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <div className="max-w-[760px]">
        <Link
          href="/"
          className="group text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent inline-flex items-center gap-1.5 rounded-full border py-[5px] pr-3.5 pl-[11px] text-[13px] font-medium transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          {t("backToArticles")}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {article.verdict && <VerdictBadge verdict={article.verdict} />}
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
            {article.sourceName}
          </span>
          {article.publishedAt && (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {t("publishedOn")}{" "}
              {format.dateTime(article.publishedAt, { dateStyle: "long" })}
            </span>
          )}
        </div>

        <h1 className="mt-4 font-serif text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">
          {article.title}
        </h1>

        {article.originalTitle && article.originalTitle !== article.title && (
          <p className="text-muted-foreground mt-3 text-sm">
            <span className="font-medium">{t("originalTitle")}</span> —{" "}
            <span className="italic">«&nbsp;{article.originalTitle}&nbsp;»</span>
          </p>
        )}

        {article.summary && (
          <p className="text-muted-foreground mt-4 text-lg leading-[1.55]">
            {article.summary}
          </p>
        )}

        <div className="mt-6 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[14px] border">
          <ArticleImage
            src={article.imageUrl}
            verdict={article.verdict}
            label={article.sourceName}
            labelClassName="text-base tracking-[0.08em]"
          />
        </div>

        <div className="mt-7">
          <div className="flex flex-wrap items-center gap-4">
            {article.reliabilityScore !== null && (
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-bold tracking-tight">
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
                <ExternalLink className="size-3.5" />
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
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            {statusCounts.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <ClaimStatusBadge status={status} />
                <span className="text-muted-foreground text-sm">×{count}</span>
              </span>
            ))}
          </div>
        )}

        {article.articleTags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {article.articleTags.map(({ tag }) => (
              <Badge key={tag.id} variant="secondary">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {hasBody && (
        <section className="mt-14">
          <header className="max-w-[720px]">
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              {t("readingIntroTitle")}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t("readingIntroSubtitle")}
            </p>
          </header>

          <div
            className="mt-6 mb-2 hidden border-b pb-3 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6"
            aria-hidden
          >
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
              {t("colOriginal")}
            </span>
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
              {t("colVerification")}
            </span>
          </div>

          <ArticleReader
            paragraphs={paragraphs}
            claims={readerClaims}
            statusLabels={statusLabels}
            sourcesLabel={t("sourcesConsulted")}
            verificationLabel={t("verificationTag")}
            mobileLabel={t("asideMobileLabel")}
          />
        </section>
      )}

      {orphans.length > 0 && (
        <section className="mt-14 max-w-[760px]">
          <h2 className="font-serif text-2xl font-bold tracking-tight">
            {hasBody ? t("otherChecks") : t("claimsTitle")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {orphans.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={toCardData(claim)}
                sourcesLabel={t("sourcesConsulted")}
                verificationLabel={t("verificationTag")}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
