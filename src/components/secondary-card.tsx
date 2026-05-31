import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { LowCriterionBadge } from "@/components/low-criterion-badge";
import { VerdictBadge } from "@/components/verdict-badge";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function SecondaryCard({ article }: { article: FeedArticle }) {
  const tag = article.articleTags[0]?.tag.label;
  const eyebrow = [article.sourceName, tag].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card grid grid-cols-[120px_1fr] gap-3.5 overflow-hidden rounded-xl border transition-shadow hover:shadow-sm"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
          labelClassName="text-[10px] tracking-[0.1em] p-1"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 py-3 pr-3.5 pl-0">
        <div className="flex flex-wrap items-center gap-2">
          {article.verdict && <VerdictBadge verdict={article.verdict} />}
          {article.reliabilityScore !== null && (
            <span className="text-muted-foreground font-mono text-xs">
              {article.reliabilityScore}/100
            </span>
          )}
          <LowCriterionBadge scores={article} />
        </div>
        <h3 className="group-hover:text-primary line-clamp-3 font-serif text-[15px] leading-[1.25] font-bold text-balance transition-colors">
          {article.title}
        </h3>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
          {eyebrow}
        </p>
      </div>
    </Link>
  );
}
