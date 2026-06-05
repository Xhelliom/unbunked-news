import { useTranslations } from "next-intl";

import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { LowCriterionBadge } from "@/components/low-criterion-badge";
import { VerdictBadge } from "@/components/verdict-badge";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function SecondaryCard({ article }: { article: FeedArticle }) {
  const tr = useTranslations("rubrics");
  const rubric = article.rubric ? tr(`${article.rubric}.label`) : undefined;
  const eyebrow = [article.sourceName, rubric].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card grid grid-cols-[120px_1fr] gap-3.5 overflow-hidden rounded-xl border transition-shadow hover:shadow-sm lg:grid-cols-[40%_1fr] lg:flex-1"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden lg:aspect-auto lg:h-full">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
          labelClassName="text-[10px] tracking-[0.1em] p-1 lg:text-sm lg:tracking-[0.12em]"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1.5 py-3 pr-3.5 pl-0 lg:py-5">
        <div className="flex flex-wrap items-center gap-2">
          {article.verdict && <VerdictBadge verdict={article.verdict} />}
          {article.reliabilityScore !== null && (
            <span className="text-muted-foreground font-mono text-xs">
              {article.reliabilityScore}/100
            </span>
          )}
          <LowCriterionBadge scores={article} />
        </div>
        <h3 className="group-hover:text-primary line-clamp-3 font-serif text-[15px] leading-[1.25] font-bold text-balance transition-colors lg:text-[17px]">
          {article.title}
        </h3>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
          {eyebrow}
        </p>
      </div>
    </Link>
  );
}
