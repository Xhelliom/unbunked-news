import { ArrowLeft, ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { PublicArticle } from "@/lib/articles";
import { safeHttpUrl } from "@/lib/safe-url";
import { CLAIM_STATUSES } from "@/lib/claim-status";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { verdictDotClasses } from "@/lib/verdicts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleImage } from "@/components/article-image";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { ScoreCriteria } from "@/components/score-criteria";
import { ScoreDescriptors } from "@/components/score-descriptors";

// Below this gap, updatedAt is treated as equal to publishedAt (publishing bumps
// both in the same write), so the "updated on" line only shows after a genuine
// later edit or in-place re-analysis.
const UPDATED_NOTICE_MIN_GAP_MS = 60_000;

// The masthead of the reader view: back link, verdict, source, headline, hero
// image, the reliability score block, the claim-status strip and the rubric.
// Pure presentation derived from the article; shared by the public route and
// the admin preview through ArticleView.
export async function ArticleHeader({ article }: { article: PublicArticle }) {
  const t = await getTranslations("article");
  const tVerdict = await getTranslations("verdicts");
  const tRubric = await getTranslations("rubrics");
  const format = await getFormatter();

  // The original URL is stored from a scraped/proposed source; only link out to
  // a real http(s) URL.
  const originalUrl = safeHttpUrl(article.urlOrigine);

  const statusCounts = CLAIM_STATUSES.map((status) => ({
    status,
    count: article.claims.filter((claim) => claim.status === status).length,
  })).filter(({ count }) => count > 0);

  const wasUpdatedAfterPublish =
    article.publishedAt !== null &&
    article.updatedAt.getTime() - article.publishedAt.getTime() >
      UPDATED_NOTICE_MIN_GAP_MS;

  return (
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
        {wasUpdatedAfterPublish && (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {t("updatedOn")}{" "}
            {format.dateTime(article.updatedAt, { dateStyle: "long" })}
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
  );
}
