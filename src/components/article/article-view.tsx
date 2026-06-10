import { ArrowLeft, ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { PublicArticle } from "@/lib/articles";
import {
  getApprovedContributions,
  type PublicContribution,
} from "@/lib/contributions/queries";
import { buildReadingModel } from "@/lib/reading";
import { routing } from "@/i18n/routing";
import { safeHttpUrl } from "@/lib/safe-url";
import { getSession } from "@/lib/session";
import { getSuggestedArticles } from "@/lib/suggestions";
import { CLAIM_STATUSES } from "@/lib/claim-status";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { verdictDotClasses } from "@/lib/verdicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { ArticleReadTracker } from "@/components/article-read-tracker";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { ScoreCriteria } from "@/components/score-criteria";
import { ScoreDescriptors } from "@/components/score-descriptors";
import { ArticleContributions } from "@/components/article-reader/article-contributions";
import { ArticleViewSwitcher } from "@/components/article-view-switcher";
import { ArticleSuggestions } from "@/components/article-suggestions";
import { ArticleAnalysisView } from "@/components/article/article-analysis-view";
import { ArticleUnbunkedView } from "@/components/article/article-unbunked-view";
import { toClaimCardData } from "@/components/article/claim-card-data";

type View = "analysis" | "unbunked";

type Props = {
  article: PublicArticle;
  locale: string;
  requestedView: string | undefined;
  // Admin preview renders the exact reader view of an unpublished draft; it must
  // not emit an analytics read event the way a real public visit does.
  isPreview?: boolean;
};

// The reader-facing article, shared by the public route and the admin preview so
// a draft is seen exactly as it will publish. Owns the rendering-time data
// derivation (reading model, contributions, suggestions, session).
export async function ArticleView({
  article,
  locale,
  requestedView,
  isPreview = false,
}: Props) {
  const t = await getTranslations("article");
  const tVerdict = await getTranslations("verdicts");
  const tRubric = await getTranslations("rubrics");
  const format = await getFormatter();

  const reading = buildReadingModel(
    article.showOriginal ? article.content : null,
    article.claims,
  );
  const { paragraphs, claims: locatedClaims, orphans } = reading;
  const hasBody = paragraphs.length > 0;
  const showSummaryInstead =
    !hasBody && !article.showOriginal && Boolean(article.originalSummary);

  const rewrite =
    article.rewrites.find((r) => r.locale === locale) ??
    article.rewrites.find((r) => r.locale === routing.defaultLocale) ??
    null;
  const rewriteIsFallback = rewrite !== null && rewrite.locale !== locale;
  const view: View =
    requestedView === "unbunked" && rewrite ? "unbunked" : "analysis";

  const suggestions = await getSuggestedArticles(article.id);
  const originalUrl = safeHttpUrl(article.urlOrigine);

  const statusCounts = CLAIM_STATUSES.map((status) => ({
    status,
    count: article.claims.filter((claim) => claim.status === status).length,
  })).filter(({ count }) => count > 0);

  // Approved contributions, split into article-level and per-claim (aligned by
  // index with the located reader claims).
  const approvedContributions = await getApprovedContributions(article.id);
  const contributionsByClaim = new Map<string, PublicContribution[]>();
  const articleContributions: PublicContribution[] = [];
  for (const contribution of approvedContributions) {
    if (contribution.claimId === null) {
      articleContributions.push(contribution);
      continue;
    }
    const list = contributionsByClaim.get(contribution.claimId) ?? [];
    list.push(contribution);
    contributionsByClaim.set(contribution.claimId, list);
  }
  const claimContributions = locatedClaims.map(
    (claim) => contributionsByClaim.get(claim.id) ?? [],
  );
  const claimIds = locatedClaims.map((claim) => claim.id);

  // Only the contribution form needs the session, so skip the per-request auth
  // lookup on the hot path otherwise.
  const isAuthenticated = article.contributionsEnabled
    ? (await getSession()) !== null
    : false;

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
        <ArticleAnalysisView
          paragraphs={paragraphs}
          readerClaims={locatedClaims.map(toClaimCardData)}
          claimContributions={claimContributions}
          claimIds={claimIds}
          orphanCards={orphans.map(toClaimCardData)}
          articleId={article.id}
          isAuthenticated={isAuthenticated}
          showSummaryInstead={showSummaryInstead}
          originalSummary={article.originalSummary}
        />
      )}

      {view === "unbunked" && rewrite && (
        <ArticleUnbunkedView
          title={rewrite.title}
          body={rewrite.body}
          isFallback={rewriteIsFallback}
          claimCards={article.claims.map(toClaimCardData)}
        />
      )}

      <ArticleContributions
        articleId={article.id}
        articleContributions={articleContributions}
        contributionsEnabled={article.contributionsEnabled}
        isAuthenticated={isAuthenticated}
      />

      <ArticleSuggestions articles={suggestions} />

      {!isPreview && <ArticleReadTracker />}
    </article>
  );
}
