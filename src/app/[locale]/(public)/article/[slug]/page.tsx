import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getArticleBySlug } from "@/lib/articles";
import { safeHttpUrl } from "@/lib/safe-url";
import { getSuggestedArticles } from "@/lib/suggestions";
import { buildReadingModel } from "@/lib/reading";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/claim-status";
import { verdictDotClasses } from "@/lib/verdicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { ArticleReadTracker } from "@/components/article-read-tracker";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { ScoreCriteria } from "@/components/score-criteria";
import { ScoreDescriptors } from "@/components/score-descriptors";
import { ArticleReader } from "@/components/article-reader";
import { ArticleViewSwitcher } from "@/components/article-view-switcher";
import { ArticleSuggestions } from "@/components/article-suggestions";
import { RewriteBody } from "@/components/rewrite-body";

type View = "analysis" | "unbunked";

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ view?: string }>;
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
  const tVerdict = await getTranslations("verdicts");
  const tRubric = await getTranslations("rubrics");
  const format = await getFormatter();

  const { paragraphs, claims: locatedClaims, orphans } = buildReadingModel(
    article.showOriginal ? article.content : null,
    article.claims,
  );
  const hasBody = paragraphs.length > 0;
  const showSummaryInstead =
    !hasBody && !article.showOriginal && Boolean(article.originalSummary);

  const rewrite =
    article.rewrites.find((r) => r.locale === locale) ??
    article.rewrites.find((r) => r.locale === routing.defaultLocale) ??
    null;
  const rewriteIsFallback =
    rewrite !== null && rewrite.locale !== locale;

  const { view: viewParam } = await searchParams;
  const view: View =
    viewParam === "unbunked" && rewrite ? "unbunked" : "analysis";

  const suggestions = await getSuggestedArticles(article.id);

  // The original URL is stored from a scraped/proposed source; only link out to
  // a real http(s) URL.
  const originalUrl = safeHttpUrl(article.urlOrigine);

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
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t("score")}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[32px] font-bold tracking-tight">
                  {article.reliabilityScore ?? "—"}
                </span>
                {article.reliabilityScore !== null && (
                  <span className="text-muted-foreground text-sm">/ 100</span>
                )}
                {article.verdict && (
                  <span className="text-sm font-medium">
                    · {tVerdict(`${article.verdict}.label`)}
                  </span>
                )}
              </div>
            </div>
            {originalUrl && (
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <a href={originalUrl} target="_blank" rel="noreferrer noopener">
                  {t("readOriginal")}
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            )}
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
          <ScoreCriteria scores={article} />
          <ScoreDescriptors
            framing={article.framing}
            contentType={article.contentType}
          />
        </div>

        {statusCounts.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold">{t("claimsBreakdownTitle")}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("claimsBreakdownHint")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {statusCounts.map(({ status, count }) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <ClaimStatusBadge status={status} />
                  <span className="text-muted-foreground text-sm">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {article.rubric && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/?rubric=${article.rubric}`}>
              <Badge variant="secondary">
                {tRubric(`${article.rubric}.label`)}
              </Badge>
            </Link>
          </div>
        )}
      </div>

      {rewrite && (
        <div className="mt-10 flex justify-center">
          <ArticleViewSwitcher current={view} />
        </div>
      )}

      {view === "analysis" && (
        <>
          {showSummaryInstead && (
            <section className="mt-12 max-w-[760px]">
              <h2 className="font-serif text-sm font-semibold tracking-[0.05em] uppercase">
                {t("originalSummaryTitle")}
              </h2>
              <p className="mt-3 font-serif text-lg leading-[1.7] text-pretty">
                {article.originalSummary}
              </p>
            </section>
          )}

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
                peekLabel={t("peekHint")}
                railLabel={t("railClaimLabel")}
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
        </>
      )}

      {view === "unbunked" && rewrite && (
        <section className="mt-12 max-w-[760px]">
          <header>
            <p className="text-muted-foreground text-sm">
              {t("unbunkedRewrite.intro")}
            </p>
            {rewriteIsFallback && (
              <p className="text-muted-foreground mt-2 text-xs italic">
                {t("unbunkedRewrite.fallbackNotice")}
              </p>
            )}
          </header>

          <h2 className="mt-6 font-serif text-3xl leading-[1.15] font-bold tracking-tight text-balance">
            {rewrite.title}
          </h2>

          <div className="mt-6">
            <RewriteBody
              body={rewrite.body}
              claimCount={article.claims.length}
            />
          </div>

          {article.claims.length > 0 && (
            <div className="mt-14 border-t pt-8">
              <h3 className="font-serif text-xl font-bold tracking-tight">
                {t("unbunkedRewrite.claimsTitle")}
              </h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {article.claims.map((claim, index) => (
                  <div
                    key={claim.id}
                    id={`claim-${index + 1}`}
                    className="scroll-mt-24"
                  >
                    <ClaimCard
                      claim={toCardData(claim)}
                      sourcesLabel={t("sourcesConsulted")}
                      verificationLabel={t("verificationTag")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <ArticleSuggestions articles={suggestions} />

      <ArticleReadTracker />
    </article>
  );
}
