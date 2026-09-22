import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { CardMeta } from "@/components/card-meta";
import { FeedImageOverlay } from "@/components/feed-image-overlay";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function HeroCard({ article }: { article: FeedArticle }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card grid overflow-hidden rounded-2xl border transition-shadow hover:shadow-sm lg:grid-cols-[1.05fr_1fr]"
    >
      <div className="border-border relative flex aspect-[16/9] items-center justify-center overflow-hidden lg:aspect-auto lg:min-h-[400px] lg:border-r">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
          labelClassName="text-xl tracking-[0.12em]"
        />
        <FeedImageOverlay
          verdict={article.verdict}
          score={article.reliabilityScore}
          className="p-[18px]"
        />
      </div>

      <div className="flex flex-col gap-3.5 p-8">
        <CardMeta
          sourceName={article.sourceName}
          rubric={article.rubric}
          isFeatured
        />
        <h2 className="group-hover:text-primary font-serif text-3xl leading-[1.08] font-extrabold tracking-tight text-balance transition-colors lg:text-4xl">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-muted-foreground line-clamp-4 text-[15px] leading-[1.55]">
            {article.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
