import { useTranslations } from "next-intl";

import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { CLAIM_STATUSES, claimStatusDotClasses } from "@/lib/claim-status";
import { ArticleImage } from "@/components/article-image";
import { LowCriterionBadge } from "@/components/low-criterion-badge";
import { VerdictBadge } from "@/components/verdict-badge";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function ArticleCard({ article }: { article: FeedArticle }) {
  const t = useTranslations("feed");
  const tag = article.articleTags[0]?.tag.label;
  const eyebrow = [article.sourceName, tag].filter(Boolean).join(" · ");

  // Aggregate claim statuses into the verdict-coloured breakdown bar.
  const total = article.claims.length;
  const counts = CLAIM_STATUSES.map((status) => ({
    status,
    count: article.claims.filter((claim) => claim.status === status).length,
  })).filter(({ count }) => count > 0);

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-sm"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
        />
        {article.verdict && (
          <div className="absolute top-3 left-3">
            <VerdictBadge verdict={article.verdict} />
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <LowCriterionBadge scores={article} />
        </div>
        {article.reliabilityScore !== null && (
          <span className="bg-background/90 ring-border absolute right-3 bottom-3 inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 ring-1 ring-inset backdrop-blur">
            <span className="text-[13px] font-bold tracking-tight">
              {article.reliabilityScore}
            </span>
            <span className="text-muted-foreground text-[10.5px]">/100</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
          {eyebrow}
        </p>
        <h3 className="group-hover:text-primary font-serif text-lg leading-[1.25] font-bold text-balance transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-muted-foreground line-clamp-2 text-[13.5px] leading-[1.5]">
            {article.summary}
          </p>
        )}

        {total > 0 && (
          <div className="mt-auto flex items-center gap-2.5 border-t pt-3">
            <div className="bg-muted flex h-[5px] flex-1 overflow-hidden rounded-full">
              {counts.map(({ status, count }) => (
                <span
                  key={status}
                  className={claimStatusDotClasses[status]}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              ))}
            </div>
            <span className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
              {t("claimsCount", { count: total })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
