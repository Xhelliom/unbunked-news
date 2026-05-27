import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { VerdictBadge } from "@/components/verdict-badge";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function ArticleCard({ article }: { article: FeedArticle }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="bg-card group flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
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
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {article.sourceName}
        </p>
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-bold transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {article.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
